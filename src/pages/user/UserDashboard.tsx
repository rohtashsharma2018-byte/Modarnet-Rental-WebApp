import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { RentalRequest } from "../../types";
import { format } from "date-fns";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

export default function UserDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RentalRequest[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "rentalRequests"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RentalRequest[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as RentalRequest);
      });
      data.sort((a, b) => b.createdAt - a.createdAt);
      setRequests(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, "rentalRequests"));

    return () => unsubscribe();
  }, [user]);

  const activeRentals = requests.filter(r => r.status === "active" || r.status === "approved" || r.status === "overdue");
  const pendingRequests = requests.filter(r => r.status === "pending");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Pending Requests</h3>
          </div>
          <div className="p-4">
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No pending requests.</p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="bg-slate-50 p-2.5 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{req.laptopName} (Qty: {req.quantity || 1})</div>
                      <div className="text-[10px] text-slate-500">{format(req.pickupDate, "MMM d, yyyy")} <span className="text-blue-600 font-semibold">• {req.duration} Days</span></div>
                    </div>
                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm">Active Rentals</h3>
          </div>
          <div className="p-4">
            {activeRentals.length === 0 ? (
              <p className="text-sm text-slate-500">No active rentals.</p>
            ) : (
              <div className="space-y-2">
                {activeRentals.map(req => (
                  <div key={req.id} className={`p-2.5 rounded border flex items-center justify-between ${req.status === 'overdue' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{req.laptopName} (Qty: {req.quantity || 1})</div>
                      <div className={`text-[10px] ${req.status === 'overdue' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>Return by: {format(req.returnDate, "MMM d, yyyy")}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.status === 'overdue' ? 'bg-rose-600 text-white' : 'bg-green-100 text-green-700'}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
