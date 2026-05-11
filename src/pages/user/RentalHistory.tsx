import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { RentalRequest } from "../../types";
import { format } from "date-fns";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

export default function RentalHistory() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "rentalRequests"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RentalRequest[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as RentalRequest));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(data);
    }, err => handleFirestoreError(err, OperationType.GET, "rentalRequests"));
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm">Rental History</h3>
      </div>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Laptop Model</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Dates</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Duration</th>
              <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map(req => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{req.laptopName}</span>
                  <div className="mt-1 text-[10px] text-slate-500 font-bold uppercase">Qty: {req.quantity || 1}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-xs">{format(req.pickupDate, "MMM d, yy")} - {format(req.returnDate, "MMM d, yy")}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="text-[10px] font-bold text-blue-600 uppercase">{req.duration} Days (₹{req.totalCost})</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    req.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                    req.status === 'active' ? 'bg-green-100 text-green-700' :
                    req.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }`}>
                    {req.status}
                  </span>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">You have no rental history.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
