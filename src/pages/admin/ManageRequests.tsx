import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, doc, writeBatch, getDoc, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { RentalRequest } from "../../types";
import { format } from "date-fns";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

interface RentalRequestWithUser extends RentalRequest {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export default function ManageRequests() {
  const [requests, setRequests] = useState<RentalRequestWithUser[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "rentalRequests"),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: RentalRequestWithUser[] = [];
      const userCache = new Map<string, any>();

      for (const d of snapshot.docs) {
        const req = { id: d.id, ...d.data() } as RentalRequestWithUser;
        if (!userCache.has(req.userId)) {
          try {
            const uDoc = await getDoc(doc(db, "users", req.userId));
            if (uDoc.exists()) {
              userCache.set(req.userId, uDoc.data());
            } else {
              userCache.set(req.userId, null);
            }
          } catch (e) {
            userCache.set(req.userId, null);
          }
        }
        req.user = userCache.get(req.userId) || undefined;
        data.push(req);
      }
      
      data.sort((a,b) => a.pickupDate - b.pickupDate);
      setRequests(data);
    }, err => handleFirestoreError(err, OperationType.GET, "rentalRequests"));
    return () => unsubscribe();
  }, []);

  const handleApprove = async (req: RentalRequest) => {
    try {
      const batch = writeBatch(db);
      
      const reqRef = doc(db, "rentalRequests", req.id);
      const laptopRef = doc(db, "laptops", req.laptopId);
      
      const laptopDoc = await getDoc(laptopRef);
      if (!laptopDoc.exists()) {
        toast.error("Laptop not found");
        return;
      }
      
      const currentStock = laptopDoc.data().stock;
      if (currentStock < req.quantity) {
        toast.error("Not enough stock!");
        return;
      }

      batch.update(reqRef, { status: "approved", updatedAt: Date.now() });
      batch.update(laptopRef, { stock: increment(-req.quantity), updatedAt: Date.now() });

      await batch.commit();
      toast.success("Request approved");
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, "rentalRequests/laptops");
    }
  };

  const handleReject = async (reqId: string) => {
    try {
      const batch = writeBatch(db);
      const reqRef = doc(db, "rentalRequests", reqId);
      batch.update(reqRef, { status: "rejected", updatedAt: Date.now() });
      await batch.commit();
      toast.success("Request rejected");
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, "rentalRequests");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Recent Rental Requests</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Details</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Purpose</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Laptop Model</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-slate-800">{req.user?.name || 'Unknown'}</div>
                  <div className="text-[11px] text-blue-600 truncate w-32" title={req.user?.email || ''}>{req.user?.email || 'No email'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{req.user?.phone || 'No phone'}</div>
                  <div className="text-[11px] text-slate-500 truncate w-32" title={req.user?.address || ''}>{req.user?.address || 'No address'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px] text-slate-500 truncate w-40 italic">{req.purpose}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptopName}</span>
                  <div className="mt-1 text-xs text-slate-500 font-bold">Qty: {req.quantity || 1}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">{format(req.pickupDate, "MMM d")} - {format(req.returnDate, "MMM d")}</div>
                  <div className="text-[10px] font-bold text-blue-600 uppercase">{req.duration} Days ({`₹${req.totalCost}`})</div>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => handleApprove(req)} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-100 uppercase tracking-wider">Approve</button>
                  <button onClick={() => handleReject(req.id)} className="px-3 py-1 bg-white text-slate-400 border border-slate-200 rounded text-xs font-bold hover:bg-rose-50 hover:text-rose-600 uppercase tracking-wider">Reject</button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">No pending requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
