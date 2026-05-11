import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Laptop } from "../../types";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { handleFirestoreError, OperationType } from "../../lib/firestoreErrorHandler";

interface LaptopForm {
  name: string;
  description: string;
  pricePerDay: number;
  price?: number;
  stock: number;
}

export default function Inventory() {
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLaptop, setEditingLaptop] = useState<Laptop | null>(null);
  
  const { register, handleSubmit, reset } = useForm<LaptopForm>();

  useEffect(() => {
    const q = query(collection(db, "laptops"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Laptop[] = [];
      snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Laptop));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setLaptops(data);
    }, err => handleFirestoreError(err, OperationType.GET, "laptops"));
    return () => unsubscribe();
  }, []);

  const onSubmit = async (data: LaptopForm) => {
    try {
      if (editingLaptop) {
        await updateDoc(doc(db, "laptops", editingLaptop.id), {
          ...data,
          pricePerDay: Number(data.pricePerDay),
          price: data.price ? Number(data.price) : 0,
          stock: Number(data.stock),
          updatedAt: Date.now()
        });
        toast.success("Laptop updated");
      } else {
        await addDoc(collection(db, "laptops"), {
          ...data,
          pricePerDay: Number(data.pricePerDay),
          price: data.price ? Number(data.price) : 0,
          stock: Number(data.stock),
          imageUrl: "", 
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        toast.success("Laptop added");
      }
      setIsDialogOpen(false);
      setEditingLaptop(null);
      reset();
    } catch(e) {
      handleFirestoreError(e, editingLaptop ? OperationType.UPDATE : OperationType.CREATE, "laptops");
    }
  };

  const handleEdit = (laptop: Laptop) => {
    setEditingLaptop(laptop);
    reset({ name: laptop.name, description: laptop.description, pricePerDay: laptop.pricePerDay, price: laptop.price || 0, stock: laptop.stock });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if(confirm("Are you sure you want to delete this laptop?")) {
      try {
        await deleteDoc(doc(db, "laptops", id));
        toast.success("Laptop deleted");
      } catch(e) {
        handleFirestoreError(e, OperationType.DELETE, `laptops/${id}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Inventory Management</h3>
          <button onClick={() => { setIsDialogOpen(true); setEditingLaptop(null); reset({name:'',description:'',pricePerDay:0,price:0,stock:0}); }} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
            + New Laptop
          </button>
        </div>
        
        {isDialogOpen && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
            <h4 className="font-bold text-sm">{editingLaptop ? "Edit Laptop" : "Add New Laptop"}</h4>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                  <input {...register("name", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <input {...register("description")} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Total Laptop Price (₹)</label>
                  <input type="number" step="0.01" {...register("price")} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Price/Day (₹)</label>
                  <input type="number" step="0.01" {...register("pricePerDay", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Stock</label>
                  <input type="number" {...register("stock", { required: true })} className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsDialogOpen(false)} className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-200 hover:bg-slate-300 rounded">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded">{editingLaptop ? "Update" : "Add"}</button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Laptop Model</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Total Price</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Price / Day</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">Stock</th>
                <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {laptops.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 text-xs font-mono">{l.name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{l.price ? `₹${l.price}` : '-'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">₹{l.pricePerDay}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'}`}>
                      {l.stock} {l.stock > 0 ? 'Available' : 'Out'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button onClick={() => handleEdit(l)} className="px-2 py-1 bg-white text-slate-600 border border-slate-200 rounded text-xs font-bold hover:bg-slate-50">Edit</button>
                    <button onClick={() => handleDelete(l.id)} className="px-2 py-1 bg-white text-rose-600 border border-slate-200 rounded text-xs font-bold hover:bg-rose-50">Del</button>
                  </td>
                </tr>
              ))}
              {laptops.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500">No inventory found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
