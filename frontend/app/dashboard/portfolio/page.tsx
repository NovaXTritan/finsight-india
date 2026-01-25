'use client';

import { useEffect, useState } from 'react';
import {
  portfolioApi,
  Holding,
  HoldingList,
  Transaction,
  TransactionList,
  PortfolioSummary,
} from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  PieChart,
  History,
  X,
} from 'lucide-react';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [activeTab, setActiveTab] = useState<'holdings' | 'transactions'>('holdings');

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      const [holdingsData, summaryData] = await Promise.all([
        portfolioApi.getHoldings(),
        portfolioApi.getSummary(),
      ]);
      setHoldings(holdingsData.holdings);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await portfolioApi.getTransactions(1, 50);
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchTransactions();
  }, []);

  const handleDeleteHolding = async (symbol: string) => {
    if (!confirm(`Remove ${symbol} from portfolio?`)) return;
    try {
      await portfolioApi.deleteHolding(symbol);
      fetchPortfolio();
    } catch (error) {
      console.error('Failed to delete holding:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
          <p className="text-gray-500">Track your holdings and P&L</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchPortfolio}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-5 w-5 text-gray-500" />
          </button>
          <button
            onClick={() => setShowTransactionModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <History className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Holding</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-sm">Invested</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.total_invested)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              <PieChart className="h-4 w-4" />
              <span className="text-sm">Current Value</span>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(summary.total_current_value)}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              {summary.total_gain_loss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Total P&L</span>
            </div>
            <p
              className={`text-xl font-bold ${
                summary.total_gain_loss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.total_gain_loss)}
              <span className="text-sm ml-1">
                ({formatPercent(summary.total_gain_loss_pct)})
              </span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center space-x-2 text-gray-500 mb-1">
              {summary.day_change >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">Today's Change</span>
            </div>
            <p
              className={`text-xl font-bold ${
                summary.day_change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.day_change)}
              <span className="text-sm ml-1">
                ({formatPercent(summary.day_change_pct)})
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('holdings')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'holdings'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Holdings ({holdings.length})
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            activeTab === 'transactions'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Transactions ({transactions.length})
        </button>
      </div>

      {/* Holdings Table */}
      {activeTab === 'holdings' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Loading portfolio...</p>
            </div>
          ) : holdings.length === 0 ? (
            <div className="p-8 text-center">
              <Wallet className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-500">No holdings yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                Add your first holding
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Avg Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Invested
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      LTP
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Current Value
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      P&L
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Day Change
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {holdings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{holding.symbol}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {holding.quantity}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(holding.avg_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {formatCurrency(holding.invested_value)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {holding.current_price ? formatCurrency(holding.current_price) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {holding.current_value ? formatCurrency(holding.current_value) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${
                            (holding.gain_loss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {holding.gain_loss !== undefined
                            ? `${formatCurrency(holding.gain_loss)} (${formatPercent(holding.gain_loss_pct || 0)})`
                            : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm ${
                            (holding.day_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {holding.day_change !== undefined
                            ? formatPercent(holding.day_change_pct || 0)
                            : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingHolding(holding);
                              setShowAddModal(true);
                            }}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(holding.symbol)}
                            className="p-1 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <History className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-500">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Symbol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{tx.transaction_date}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{tx.symbol}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            tx.type === 'BUY'
                              ? 'bg-green-100 text-green-700'
                              : tx.type === 'SELL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {tx.quantity || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {tx.price ? formatCurrency(tx.price) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {tx.amount ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-sm truncate max-w-[200px]">
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Holding Modal */}
      {showAddModal && (
        <HoldingModal
          holding={editingHolding}
          onClose={() => {
            setShowAddModal(false);
            setEditingHolding(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingHolding(null);
            fetchPortfolio();
          }}
        />
      )}

      {/* Add Transaction Modal */}
      {showTransactionModal && (
        <TransactionModal
          onClose={() => setShowTransactionModal(false)}
          onSave={() => {
            setShowTransactionModal(false);
            fetchPortfolio();
            fetchTransactions();
          }}
        />
      )}
    </div>
  );
}

// Holding Modal Component
function HoldingModal({
  holding,
  onClose,
  onSave,
}: {
  holding: Holding | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [symbol, setSymbol] = useState(holding?.symbol || '');
  const [quantity, setQuantity] = useState(holding?.quantity?.toString() || '');
  const [avgPrice, setAvgPrice] = useState(holding?.avg_price?.toString() || '');
  const [notes, setNotes] = useState(holding?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!holding;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isEdit) {
        await portfolioApi.updateHolding(symbol, {
          quantity: parseInt(quantity),
          avg_price: parseFloat(avgPrice),
          notes: notes || undefined,
        });
      } else {
        await portfolioApi.addHolding(
          symbol.toUpperCase(),
          parseInt(quantity),
          parseFloat(avgPrice),
          notes || undefined
        );
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save holding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Edit Holding' : 'Add Holding'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Symbol
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="RELIANCE"
              required
              disabled={isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="100"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Average Price
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="2500.00"
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Investment thesis..."
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors"
            >
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Transaction Modal Component
function TransactionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL' | 'DIVIDEND'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [fees, setFees] = useState('0');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await portfolioApi.addTransaction({
        symbol: symbol.toUpperCase(),
        type,
        quantity: type !== 'DIVIDEND' ? parseInt(quantity) : undefined,
        price: type !== 'DIVIDEND' ? parseFloat(price) : undefined,
        amount: type === 'DIVIDEND' ? parseFloat(amount) : undefined,
        fees: parseFloat(fees) || 0,
        transaction_date: date,
        notes: notes || undefined,
      });
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Transaction</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex space-x-2">
              {(['BUY', 'SELL', 'DIVIDEND'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    type === t
                      ? t === 'BUY'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : t === 'SELL'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="RELIANCE"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {type !== 'DIVIDEND' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="100"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per share
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="2500.00"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dividend Amount
              </label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="5000.00"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fees/Charges
            </label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Transaction notes..."
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 transition-colors"
            >
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
