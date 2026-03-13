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
      <div className="card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-lg">
              <Wallet className="h-6 w-6 text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Portfolio</h1>
              <p className="text-[var(--text-secondary)]">Track your holdings and P&L</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPortfolio}
              className="p-2.5 hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-5 w-5 text-primary-400" />
            </button>
            <button
              onClick={() => setShowTransactionModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-[var(--bg-muted)] border border-[var(--border-default)] hover:bg-[var(--bg-muted)] text-primary-400 rounded-lg transition-all"
            >
              <History className="h-4 w-4" />
              <span>Add Transaction</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary px-5 py-2.5 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Holding</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 card-hover-lift">
            <div className="flex items-center space-x-2 text-[var(--text-secondary)] mb-2">
              <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg">
                <Wallet className="h-4 w-4 text-primary-400" />
              </div>
              <span className="text-sm font-medium">Invested</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {formatCurrency(summary.total_invested)}
            </p>
          </div>

          <div className="card p-5 card-hover-lift">
            <div className="flex items-center space-x-2 text-[var(--text-secondary)] mb-2">
              <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <PieChart className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-sm font-medium">Current Value</span>
            </div>
            <p className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              {formatCurrency(summary.total_current_value)}
            </p>
          </div>

          <div className={`card p-5 card-hover-lift border-l-4 ${
            summary.total_gain_loss >= 0 ? 'border-l-green-500' : 'border-l-red-500'
          }`}>
            <div className="flex items-center space-x-2 text-[var(--text-secondary)] mb-2">
              <div className={`p-2 rounded-lg ${
                summary.total_gain_loss >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {summary.total_gain_loss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              <span className="text-sm font-medium">Total P&L</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${
              summary.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(summary.total_gain_loss)}
              <span className="text-sm font-mono ml-1">
                ({formatPercent(summary.total_gain_loss_pct)})
              </span>
            </p>
          </div>

          <div className={`card p-5 card-hover-lift border-l-4 ${
            summary.day_change >= 0 ? 'border-l-green-500' : 'border-l-red-500'
          }`}>
            <div className="flex items-center space-x-2 text-[var(--text-secondary)] mb-2">
              <div className={`p-2 rounded-lg ${
                summary.day_change >= 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {summary.day_change >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-400" />
                )}
              </div>
              <span className="text-sm font-medium">Today's Change</span>
            </div>
            <p className={`text-2xl font-bold font-mono ${
              summary.day_change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(summary.day_change)}
              <span className="text-sm font-mono ml-1">
                ({formatPercent(summary.day_change_pct)})
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card px-6 py-3">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'holdings'
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Holdings ({holdings.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'transactions'
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]'
            }`}
          >
            Transactions ({transactions.length})
          </button>
        </nav>
      </div>

      {/* Holdings Table */}
      {activeTab === 'holdings' && (
        <div className="card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full animate-pulse" />
                <RefreshCw className="relative h-16 w-16 text-primary-500 animate-spin mx-auto" />
              </div>
              <p className="text-[var(--text-secondary)]">Loading portfolio...</p>
            </div>
          ) : holdings.length === 0 ? (
            <div className="p-12 text-center">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
                <Wallet className="relative h-20 w-20 text-primary-300 mx-auto" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">No holdings yet</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 btn-primary px-6 py-2.5"
              >
                Add your first holding
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg Price</th>
                    <th className="text-right">Invested</th>
                    <th className="text-right">LTP</th>
                    <th className="text-right">Current Value</th>
                    <th className="text-right">P&L</th>
                    <th className="text-right">Day Change</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((holding) => (
                    <tr key={holding.id}>
                      <td>
                        <span className="font-semibold text-[var(--text-primary)]">{holding.symbol}</span>
                      </td>
                      <td className="text-right font-mono text-[var(--text-secondary)]">{holding.quantity}</td>
                      <td className="text-right font-mono text-[var(--text-secondary)]">{formatCurrency(holding.avg_price)}</td>
                      <td className="text-right font-mono text-[var(--text-secondary)]">{formatCurrency(holding.invested_value)}</td>
                      <td className="text-right font-medium font-mono text-[var(--text-primary)]">
                        {holding.current_price ? formatCurrency(holding.current_price) : '-'}
                      </td>
                      <td className="text-right font-medium font-mono text-[var(--text-primary)]">
                        {holding.current_value ? formatCurrency(holding.current_value) : '-'}
                      </td>
                      <td className="text-right">
                        <span className={`font-medium font-mono ${
                          (holding.gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {holding.gain_loss !== undefined
                            ? `${formatCurrency(holding.gain_loss)} (${formatPercent(holding.gain_loss_pct || 0)})`
                            : '-'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={`text-sm font-medium font-mono ${
                          (holding.day_change || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {holding.day_change !== undefined
                            ? formatPercent(holding.day_change_pct || 0)
                            : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingHolding(holding);
                              setShowAddModal(true);
                            }}
                            className="p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4 text-primary-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteHolding(holding.symbol)}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
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
        <div className="card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="relative mx-auto w-20 h-20 mb-4">
                <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" />
                <History className="relative h-20 w-20 text-primary-300 mx-auto" />
              </div>
              <p className="text-[var(--text-secondary)]">No transactions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Amount</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="text-[var(--text-secondary)]">{tx.transaction_date}</td>
                      <td className="font-semibold text-[var(--text-primary)]">{tx.symbol}</td>
                      <td>
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          tx.type === 'BUY'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : tx.type === 'SELL'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="text-right font-mono text-[var(--text-secondary)]">{tx.quantity || '-'}</td>
                      <td className="text-right font-mono text-[var(--text-secondary)]">
                        {tx.price ? formatCurrency(tx.price) : '-'}
                      </td>
                      <td className="text-right font-medium font-mono text-[var(--text-primary)]">
                        {tx.amount ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="text-[var(--text-muted)] text-sm truncate max-w-[200px]">
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] w-full max-w-md p-6 mx-4 rounded-lg animate-slide-down">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {isEdit ? 'Edit Holding' : 'Add Holding'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors">
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="input w-full"
              placeholder="RELIANCE"
              required
              disabled={isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input w-full font-mono"
              placeholder="100"
              required
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Average Price</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                className="input w-full pl-10 font-mono"
                placeholder="2500.00"
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              placeholder="Investment thesis..."
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto rounded-lg animate-slide-down">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Add Transaction</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-muted)] rounded-lg transition-colors">
            <X className="h-5 w-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm border border-red-500/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Type</label>
            <div className="flex space-x-2">
              {(['BUY', 'SELL', 'DIVIDEND'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    type === t
                      ? t === 'BUY'
                        ? 'bg-green-500/10 text-green-400 border-2 border-green-500'
                        : t === 'SELL'
                        ? 'bg-red-500/10 text-red-400 border-2 border-red-500'
                        : 'bg-blue-500/10 text-blue-400 border-2 border-blue-500'
                      : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border-2 border-transparent'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="input w-full"
              placeholder="RELIANCE"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          {type !== 'DIVIDEND' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="input w-full font-mono"
                  placeholder="100"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Price per share</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="input w-full pl-10 font-mono"
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Dividend Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input w-full pl-10 font-mono"
                  placeholder="5000.00"
                  required
                  min="0.01"
                  step="0.01"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Fees/Charges</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="number"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="input w-full pl-10 font-mono"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full"
              placeholder="Transaction notes..."
              rows={2}
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
