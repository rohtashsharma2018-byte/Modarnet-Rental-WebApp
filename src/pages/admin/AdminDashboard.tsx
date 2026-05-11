import React, { useEffect, useState } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { RentalRequest, Laptop } from "../../types";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ requests: 0, active: 0, overdue: 0, totalAssets: 0, totalRentals: 0 });

  useEffect(() => {
    const reqQ = query(collection(db, "rentalRequests"));
    const unsubReq = onSnapshot(reqQ, (snapshot) => {
      let reqs = 0, active = 0, overdue = 0, totalRentals = 0;
      snapshot.forEach(doc => {
        const d = doc.data() as RentalRequest;
        if (d.status === "pending") reqs++;
        if (d.status === "active" || d.status === "approved" || d.status === "overdue") {
          totalRentals += (d.totalCost || 0);
        }
        if (d.status === "active" || d.status === "approved") active++;
        if (d.status === "overdue") overdue++;
      });
      setStats(prev => ({ ...prev, requests: reqs, active, overdue, totalRentals }));
    }, err => console.error(err));

    const laptopQ = query(collection(db, "laptops"));
    const unsubLaptops = onSnapshot(laptopQ, (snapshot) => {
      let assets = 0;
      snapshot.forEach(doc => {
        const d = doc.data() as Laptop;
        assets += (d.price || 0);
      });
      setStats(prev => ({ ...prev, totalAssets: assets }));
    }, err => console.error(err));

    return () => {
      unsubReq();
      unsubLaptops();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Assets</div>
          <div className="text-2xl sm:text-3xl font-bold truncate" title={`₹${stats.totalAssets.toLocaleString()}`}>₹{stats.totalAssets.toLocaleString()}</div>
          <div className="text-emerald-500 text-[10px] mt-2 font-semibold">Inventory Valuation</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Total Rentals</div>
          <div className="text-2xl sm:text-3xl font-bold truncate" title={`₹${stats.totalRentals.toLocaleString()}`}>₹{stats.totalRentals.toLocaleString()}</div>
          <div className="text-blue-500 text-[10px] mt-2 font-semibold">Cost of Active/Overdue</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Pending Requests</div>
          <div className="text-2xl sm:text-3xl font-bold truncate">{stats.requests}</div>
          <div className="text-blue-500 text-[10px] mt-2 font-semibold">Awaiting Approval</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Active Rentals</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-800 truncate">{stats.active}</div>
          <div className="text-slate-400 text-[10px] mt-2 font-semibold">Currently Deploying</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-1">Overdue Items</div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-500 truncate">{stats.overdue}</div>
          <div className="text-rose-400 text-[10px] mt-2 font-semibold italic">{stats.overdue > 0 ? "Immediate Action Required" : "All good"}</div>
        </div>
      </div>
    </div>
  );
}
