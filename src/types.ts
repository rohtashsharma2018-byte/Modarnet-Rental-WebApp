export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  phone: string;
  address: string;
  createdAt: number;
}

export interface Laptop {
  id: string;
  name: string;
  description: string;
  pricePerDay: number;
  price?: number;
  stock: number;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
}

export type RentalStatus = "pending" | "approved" | "rejected" | "active" | "completed" | "overdue";

export interface RentalRequest {
  id: string;
  userId: string;
  laptopId: string;
  laptopName: string;
  quantity: number;
  pickupDate: number; // timestamps
  returnDate: number;
  duration: number; // days
  purpose: string;
  status: RentalStatus;
  totalCost: number;
  createdAt: number;
  updatedAt: number;
}
