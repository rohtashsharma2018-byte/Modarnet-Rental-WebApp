import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { Laptop } from "../../types";
import { toast } from "sonner";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

interface FormValues {
  laptopId: string;
  quantity: number;
  pickupDate: string;
  returnDate: string;
  phone: string;
  address: string;
  purpose: string;
}

export default function RentalRequestForm() {
  const { user } = useAuth();
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [selectedLaptop, setSelectedLaptop] = useState<Laptop | null>(null);
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>();

  const watchLaptopId = watch("laptopId");
  const watchPickup = watch("pickupDate");
  const watchReturn = watch("returnDate");
  const watchQuantity = watch("quantity", 1);

  useEffect(() => {
    const q = query(collection(db, "laptops"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Laptop[] = [];
      snapshot.forEach(d => data.push({ id: d.id, ...d.data() } as Laptop));
      setLaptops(data.filter(l => l.stock > 0)); 
    }, err => handleFirestoreError(err, OperationType.GET, "laptops"));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (watchLaptopId) {
      setSelectedLaptop(laptops.find(l => l.id === watchLaptopId) || null);
    }
  }, [watchLaptopId, laptops]);

  const onSubmit = async (data: FormValues) => {
    if (!user || !selectedLaptop) return;

    try {
      const pDate = new Date(data.pickupDate).getTime();
      const rDate = new Date(data.returnDate).getTime();
      const quantity = Number(data.quantity) || 1;
      const duration = Math.ceil((rDate - pDate) / (1000 * 60 * 60 * 24));

      if (duration <= 0) {
        toast.error("Return date must be after pickup date.");
        return;
      }

      const totalCost = duration * selectedLaptop.pricePerDay * quantity;

      // Ensure user profile has phone/address populated (by updating it)
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const u = userDoc.data();
        if (!u.phone || !u.address) {
           await updateDoc(userRef, {
             phone: data.phone,
             address: data.address
           });
        }
      }

      await addDoc(collection(db, "rentalRequests"), {
        userId: user.uid,
        laptopId: selectedLaptop.id,
        laptopName: selectedLaptop.name,
        quantity,
        pickupDate: pDate,
        returnDate: rDate,
        duration,
        purpose: data.purpose,
        status: "pending",
        totalCost,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      toast.success("Rental request submitted successfully");
      reset();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, "rentalRequests");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-sm tracking-tight">Submit Rental Request</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Laptop</label>
                <select 
                  {...register("laptopId", { required: true })}
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select a laptop --</option>
                  {laptops.map(l => (
                    <option key={l.id} value={l.id}>{l.name} (₹{l.pricePerDay}/day - {l.stock} available)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity</label>
                <input 
                  type="number" 
                  min={1} 
                  max={selectedLaptop?.stock || 1}
                  {...register("quantity", { required: true, min: 1, valueAsNumber: true })} 
                  className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pickup Date</label>
                <input type="date" {...register("pickupDate", { required: true })} className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Return Date</label>
                <input type="date" {...register("returnDate", { required: true })} className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3">
                 <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                 <input value={user?.email || ''} readOnly disabled className="w-full rounded border border-slate-200 bg-slate-50 p-2 text-sm text-slate-500 cursor-not-allowed" />
              </div>
              <div className="lg:col-span-1">
                 <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Mobile Number</label>
                 <input {...register("phone", { required: true })} placeholder="+1 234 567 8900" className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
              <div className="lg:col-span-2">
                 <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery Address</label>
                 <input {...register("address", { required: true })} placeholder="123 Main St, City" className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 bg-white" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose of Rent</label>
              <textarea {...register("purpose", { required: true })} rows={3} placeholder="e.g. For a week-long coding bootcamp" className="w-full rounded border border-slate-300 p-2 text-sm focus:outline-none focus:border-blue-500 resize-none" />
            </div>

            {selectedLaptop && watchPickup && watchReturn && (
              <div className="p-3 bg-blue-50 rounded border border-blue-100 flex justify-between items-center text-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Estimated Cost</div>
                  <div className="text-slate-500 text-xs">Based on ₹{selectedLaptop.pricePerDay}/day × {watchQuantity}</div>
                </div>
                <div className="text-xl font-bold text-slate-900">
                  ₹{ (Math.ceil((new Date(watchReturn).getTime() - new Date(watchPickup).getTime()) / (1000 * 60 * 60 * 24)) * selectedLaptop.pricePerDay * watchQuantity) > 0 ? (Math.ceil((new Date(watchReturn).getTime() - new Date(watchPickup).getTime()) / (1000 * 60 * 60 * 24)) * selectedLaptop.pricePerDay * watchQuantity) : 0 }
                </div>
              </div>
            )}

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded text-sm font-bold tracking-wide transition-colors mt-2">
              SUBMIT RENTAL REQUEST
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
