import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// import type { Course } from '../utils/courseData';

export type OrderStatus = 'pending' | 'approved' | 'delivering' | 'completed' | 'cancelled' | 'resolution';

type Course = {
  id?: string | number;
  title?: string;
  image?: string;
  [key: string]: unknown;
};

export interface OrderItem {
  course: Course;
  duration: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentInfo: {
    accountName: string;
    accountNumber: string;
    paymentApv: string;
    method: string;
    dateTimePay: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface OrderContextType {
  orders: Order[];
  createOrder: (items: OrderItem[], paymentInfo: Order['paymentInfo'], userId: string, status?: OrderStatus) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getUserOrders: (userId: string) => Order[];
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('edugroit-orders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('edugroit-orders', JSON.stringify(orders));
  }, [orders]);

  const createOrder = (items: OrderItem[], paymentInfo: Order['paymentInfo'], userId: string, status?: OrderStatus) => {
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const newOrder: Order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      items,
      totalAmount,
      status: status || 'pending',
      paymentInfo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders(prev => [newOrder, ...prev]);
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status, updatedAt: new Date().toISOString() }
        : order
    ));
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  const getUserOrders = (userId: string) => {
    return orders.filter(order => order.userId === userId);
  };

  return (
    <OrderContext.Provider value={{ 
      orders, 
      createOrder, 
      updateOrderStatus, 
      getOrdersByStatus,
      getUserOrders 
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders must be used within OrderProvider');
  }
  return context;
}
