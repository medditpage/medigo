export type UserRole = "patient" | "agent" | "admin";
export type AgentStatus = "pending" | "approved" | "rejected" | "banned";
export type OrderStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "purchasing"
  | "bill_uploaded"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "expired";
export type PaymentStatus = "pending" | "paid";
export type OrderMethod = "prescription" | "manual";
export type ComplaintCategory =
  | "wrong_medicine"
  | "missing_medicine"
  | "damaged_product"
  | "late_delivery"
  | "overcharging"
  | "other";
export type ComplaintStatus = "open" | "in_progress" | "resolved";
export type NotificationType =
  | "registration"
  | "order_placed"
  | "order_accepted"
  | "bill_generated"
  | "out_for_delivery"
  | "delivered"
  | "complaint"
  | "general";

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  mobile: string;
  email: string;
  language: string;
  isBanned: boolean;
  createdAt: string;
  addresses?: Address[];
  familyMembers?: FamilyMember[];
  deliveryAgent?: DeliveryAgent | null;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  fullName: string;
  relation: string;
  age: number | null;
  mobile: string | null;
  createdAt: string;
}

export interface DeliveryAgent {
  id: string;
  userId: string;
  aadhaarNumber: string;
  aadhaarImageUrl: string;
  profilePhotoUrl: string | null;
  vehicleType: string;
  vehicleNumber: string;
  status: AgentStatus;
  isOnline: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  ratingAvg: string;
  ratingCount: number;
  totalDeliveries: number;
  createdAt: string;
  user?: User;
}

export interface MedicalStore {
  id: string;
  name: string;
  ownerName: string | null;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  distanceKm?: number;
  licenseNumber: string | null;
  isActive: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  medicineName: string;
  quantity: number;
  unitPrice: string | null;
  imageUrl: string | null;
  notes: string | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  status: OrderStatus;
  actorId: string | null;
  actorRole: UserRole | null;
  note: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  medicineCost: string;
  deliveryCharge: string;
  baseCharge: string;
  platformCharge: string;
  urgentCharge: string;
  taxAmount: string;
  totalAmount: string;
  pdfUrl: string | null;
  htmlContent: string | null;
  createdAt: string;
}

export interface OrderRating {
  id: string;
  orderId: string;
  patientId: string;
  agentId: string;
  rating: number;
  review: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  patientId: string;
  familyMemberId: string | null;
  storeId: string | null;
  agentId: string | null;
  addressId: string;
  orderMethod: OrderMethod;
  prescriptionImageUrls: string[];
  notes: string | null;
  isUrgent: boolean;
  deliveryLatitude: number;
  deliveryLongitude: number;
  distanceKm: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  medicineCost: string | null;
  deliveryCharge: string | null;
  baseCharge: string;
  platformCharge: string;
  urgentCharge: string;
  taxAmount: string;
  totalAmount: string | null;
  billImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  items?: OrderItem[];
  address?: Address;
  familyMember?: FamilyMember | null;
  store?: MedicalStore | null;
  agent?: DeliveryAgent | null;
  patient?: Pick<User, "id" | "fullName" | "mobile">;
  statusHistory?: OrderStatusHistoryEntry[];
  invoice?: Invoice | null;
  rating?: OrderRating | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Complaint {
  id: string;
  ticketNumber: string;
  orderId: string | null;
  userId: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  adminResponse: string | null;
  resolvedAt: string | null;
  createdAt: string;
  order?: { orderNumber: string } | null;
  user?: { fullName: string; email: string; mobile: string };
}

export interface DeliveryChargeRule {
  id: string;
  minDistanceKm: string;
  maxDistanceKm: string;
  charge: string;
  isActive: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string | null;
}

export interface DashboardData {
  ordersToday: number;
  deliveredToday: number;
  activeOrders: number;
  totalPatients: number;
  totalAgents: number;
  pendingAgents: number;
  activeAgentsOnline: number;
  revenueToday: number;
  deliveryChargesToday: number;
  platformChargesToday: number;
  openComplaints: number;
}

export interface AssignmentIncoming {
  assignmentId: string;
  distanceKm: string | null;
  expiresAt: string;
  order: Order;
}

export interface AgentEarning {
  id: string;
  agentId: string;
  orderId: string;
  amount: string;
  payoutStatus: "pending" | "paid";
  paidAt: string | null;
  createdAt: string;
  order?: { orderNumber: string; deliveredAt: string | null };
}
