import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { processRefund } from '@/lib/payments';
import type { Payment, Refund } from '@/types/payments';
import { formatPrice } from '@/lib/pricing';

interface AdminPayment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
  booking_id: string;
  customer_id: string;
  customer_name?: string;
  service_name?: string;
  provider_name?: string;
}

interface AdminRefund {
  id: string;
  refund_amount: number;
  refund_reason: string;
  status: string;
  created_at: string;
  booking_id: string;
  customer_name?: string;
  payment_id: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
};

export const PaymentAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'refunds'>('payments');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalVolume: 0,
    successRate: 0,
    pendingRefunds: 0,
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch payments with customer and service info
      const { data: paymentData } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            id,
            service:services(name),
            customer:users!payments_customer_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch refunds
      const { data: refundData } = await supabase
        .from('refunds')
        .select(`
          *,
          booking:bookings(
            id,
            customer:users!refunds_booking_id_fkey(full_name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const formattedPayments: AdminPayment[] = (paymentData || []).map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        payment_method: p.payment_method,
        created_at: p.created_at,
        booking_id: p.booking_id,
        customer_id: p.customer_id,
        customer_name: p.booking?.customer?.full_name || 'Unknown',
        service_name: p.booking?.service?.name || 'Unknown',
      }));

      const formattedRefunds: AdminRefund[] = (refundData || []).map((r: any) => ({
        id: r.id,
        refund_amount: r.refund_amount,
        refund_reason: r.refund_reason,
        status: r.status,
        created_at: r.created_at,
        booking_id: r.booking_id,
        customer_name: r.booking?.customer?.full_name || 'Unknown',
        payment_id: r.payment_id,
      }));

      setPayments(formattedPayments);
      setRefunds(formattedRefunds);

      // Calculate stats
      const totalVolume = formattedPayments.reduce((sum, p) => sum + p.amount, 0);
      const successfulPayments = formattedPayments.filter(p => p.status === 'paid').length;
      const successRate = formattedPayments.length > 0
        ? Math.round((successfulPayments / formattedPayments.length) * 100)
        : 0;

      setStats({
        totalPayments: formattedPayments.length,
        totalVolume,
        successRate,
        pendingRefunds: formattedRefunds.filter(r => r.status === 'pending').length,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRefund = async (refundId: string, paymentId: string) => {
    if (!confirm('Are you sure you want to process this refund?')) return;

    try {
      const result = await processRefund(
        paymentId,
        'provider_cancelled', // admin-initiated refund
        'admin'
      );

      if (result.success) {
        alert('Refund processed successfully');
        fetchAdminData();
      } else {
        alert('Refund failed: ' + result.error);
      }
    } catch (error) {
      alert('Error processing refund');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Payment Management</h1>
      <p className="text-slate-500 mb-6">Manage payments, refunds, and payouts</p>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Total Payments</div>
          <div className="text-2xl font-bold text-slate-900">{stats.totalPayments}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Total Volume</div>
          <div className="text-2xl font-bold text-green-600">{formatPrice(stats.totalVolume)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Success Rate</div>
          <div className="text-2xl font-bold text-teal-600">{stats.successRate}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">Pending Refunds</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pendingRefunds}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          All Payments
        </button>
        <button
          onClick={() => setActiveTab('refunds')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'refunds'
              ? 'border-teal-600 text-teal-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Refunds
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-slate-500 mt-4">Loading...</p>
        </div>
      ) : activeTab === 'payments' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Date</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Customer</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Service</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Amount</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Method</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm">
                    {new Date(payment.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">{payment.customer_name}</td>
                  <td className="px-6 py-4 text-sm">{payment.service_name}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{formatPrice(payment.amount)}</td>
                  <td className="px-6 py-4 text-sm capitalize">{payment.payment_method.replace('_', ' ')}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Date</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Customer</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Amount</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Reason</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Status</th>
                <th className="text-left text-xs font-semibold text-slate-600 uppercase px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm">
                    {new Date(refund.created_at).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-sm">{refund.customer_name}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-red-600">
                    -{formatPrice(refund.refund_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">
                    {refund.refund_reason.replace('_', ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[refund.status]}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {refund.status === 'pending' && (
                      <button
                        onClick={() => handleProcessRefund(refund.id, refund.payment_id)}
                        className="px-3 py-1 bg-teal-600 text-white text-xs font-medium rounded-lg hover:bg-teal-700"
                      >
                        Process
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PaymentAdminPage;