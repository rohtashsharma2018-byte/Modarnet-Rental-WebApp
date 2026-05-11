import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot, doc, writeBatch, getDoc, updateDoc, increment } from "firebase/firestore";
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

export default function ActiveRentals() {
  const [requests, setRequests] = useState<RentalRequestWithUser[]>([]);
  const [extendRequestId, setExtendRequestId] = useState<string | null>(null);
  const [extraDays, setExtraDays] = useState(1);

  useEffect(() => {
    const q = query(collection(db, "rentalRequests"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const data: RentalRequestWithUser[] = [];
      const userCache = new Map<string, any>();

      for (const snapshotDoc of snapshot.docs) {
        const d = snapshotDoc.data() as RentalRequestWithUser;
        if (d.status === "active" || d.status === "approved" || d.status === "overdue") {
          const req = { id: snapshotDoc.id, ...d };
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
      }
      data.sort((a,b) => a.returnDate - b.returnDate);
      setRequests(data);
    }, err => handleFirestoreError(err, OperationType.GET, "rentalRequests"));
    return () => unsubscribe();
  }, []);

  const handleReturn = async (req: RentalRequest) => {
    try {
      const batch = writeBatch(db);
      const reqRef = doc(db, "rentalRequests", req.id);
      const laptopRef = doc(db, "laptops", req.laptopId);
      
      const laptopDoc = await getDoc(laptopRef);
      const currentStock = laptopDoc.exists() ? laptopDoc.data().stock : 0;

      batch.update(reqRef, { status: "completed", updatedAt: Date.now() });
      if (laptopDoc.exists()) {
        batch.update(laptopRef, { stock: increment(req.quantity || 1), updatedAt: Date.now() });
      }

      await batch.commit();
      toast.success("Laptop returned and inventory updated");
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, "rentalRequests");
    }
  };

  const handleExtend = async () => {
    if (!extendRequestId) return;
    try {
      const req = requests.find(r => r.id === extendRequestId);
      if (!req) return;
      
      const laptopRef = doc(db, "laptops", req.laptopId);
      const laptopDoc = await getDoc(laptopRef);
      const pricePerDay = laptopDoc.exists() ? laptopDoc.data().pricePerDay : 0;
      
      const extraCost = extraDays * pricePerDay;
      const newReturnDate = req.returnDate + (extraDays * 24 * 60 * 60 * 1000);
      
      await updateDoc(doc(db, "rentalRequests", extendRequestId), {
        returnDate: newReturnDate,
        duration: req.duration + extraDays,
        totalCost: req.totalCost + extraCost,
        status: newReturnDate < Date.now() ? "overdue" : "active",
        updatedAt: Date.now()
      });

      toast.success("Rental extended");
      setExtendRequestId(null);
      setExtraDays(1);
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, "rentalRequests");
    }
  };

  const handleMarkOverdue = async (reqId: string) => {
    try {
      await updateDoc(doc(db, "rentalRequests", reqId), {
        status: "overdue",
        updatedAt: Date.now()
      });
      toast.success("Marked as overdue");
    } catch(e) {
      handleFirestoreError(e, OperationType.UPDATE, "rentalRequests");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Active & Overdue Rentals</h3>
        </div>
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">User Details</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Laptop Model</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Return / Cost</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(req => {
                const isOverdue = req.returnDate < Date.now();
                return (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold text-slate-800">{req.user?.name || 'Unknown'}</div>
                      <div className="text-[11px] text-blue-600 truncate w-32" title={req.user?.email || ''}>{req.user?.email || 'No email'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{req.user?.phone || 'No phone'}</div>
                      <div className="text-[11px] text-slate-500 truncate w-32" title={req.user?.address || ''}>{req.user?.address || 'No address'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptopName}</span>
                      <div className="mt-1 text-xs text-slate-500 font-bold">Qty: {req.quantity || 1}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="text-xs">{format(req.returnDate, "MMM d, yyyy")}</div>
                      <div className="text-[10px] font-bold text-blue-600 mt-1 uppercase">{req.duration} Days (₹{req.totalCost})</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.status === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'}`}>
                        {req.status}
                      </span>
                      {req.status !== "overdue" && isOverdue && (
                        <button className="text-[10px] font-bold bg-rose-600 text-white px-2 py-1 rounded shadow-sm ml-2 uppercase" onClick={() => handleMarkOverdue(req.id)}>Force Overdue</button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button onClick={() => setExtendRequestId(req.id)} className="px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded text-xs font-bold hover:bg-slate-50 uppercase tracking-wider">Extend</button>
                      <button onClick={() => handleReturn(req)} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-bold hover:bg-blue-100 uppercase tracking-wider">Return</button>
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">No active rentals.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {extendRequestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full border border-slate-200">
            <h4 className="font-bold text-slate-800 text-sm mb-4">Extend Rental</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Extra Days</label>
                <input type="number" min={1} value={extraDays} onChange={e => setExtraDays(Number(e.target.value))} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setExtendRequestId(null)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">Cancel</button>
                <button onClick={handleExtend} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">Confirm Extension</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
