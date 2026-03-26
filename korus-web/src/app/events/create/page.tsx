'use client';
import { logger } from '@/utils/logger';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import LeftSidebar from '@/components/LeftSidebar';
import RightSidebar from '@/components/RightSidebar';
import { useToast } from '@/hooks/useToast';
import { useWalletAuth } from '@/contexts/WalletAuthContext';
import * as eventsAPI from '@/lib/api/events';
import { uploadAPI } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamically import modals
const SearchModal = dynamic(() => import('@/components/SearchModal'), { ssr: false });
const CreatePostModal = dynamic(() => import('@/components/CreatePostModal'), { ssr: false });
const MobileMenuModal = dynamic(() => import('@/components/MobileMenuModal'), { ssr: false });

// Event creation fee in SOL
const EVENT_CREATION_FEE = 1; // 1 SOL fee to create an event
const PLATFORM_WALLET = new PublicKey('ByqqYGErKfyLHHd3NjgMnbbxQdPs1kFrPVWPUHUsD31W'); // Korus Treasury Wallet

export default function CreateEventPage() {
  const router = useRouter();
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const { token, isAuthenticated } = useWalletAuth();
  const { showSuccess, showError } = useToast();

  // UI State
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<eventsAPI.CreateEventData>({
    type: 'whitelist',
    projectName: '',
    title: '',
    description: '',
    imageUrl: '',
    externalLink: '',
    maxSpots: undefined,
    startDate: '',
    endDate: '',
    selectionMethod: 'fcfs',
    requirements: [],
    minReputation: undefined,
    minAccountAge: undefined,
  });

  const [requirementInput, setRequirementInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && publicKey) {
        try {
          const lamports = await connection.getBalance(publicKey);
          setBalance(lamports / LAMPORTS_PER_SOL);
        } catch (error) {
          logger.error('Failed to fetch balance:', error);
        }
      }
    };
    fetchBalance();
  }, [connected, publicKey, connection]);

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleInputChange = (field: keyof eventsAPI.CreateEventData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRequirement = () => {
    if (requirementInput.trim()) {
      setFormData(prev => ({
        ...prev,
        requirements: [...(prev.requirements || []), requirementInput.trim()]
      }));
      setRequirementInput('');
    }
  };

  const removeRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements?.filter((_, i) => i !== index)
    }));
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected) {
      showError('Please connect your wallet first');
      return;
    }

    if (!isAuthenticated || !token) {
      showError('Please authenticate your wallet');
      return;
    }

    if (!publicKey) {
      showError('Wallet not connected properly');
      return;
    }

    // Validation
    if (!formData.projectName || !formData.title || !formData.description) {
      showError('Please fill in all required fields');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      showError('Please set start and end dates');
      return;
    }

    if (!formData.externalLink) {
      showError('Please provide an external link');
      return;
    }

    // Check balance (0.001 SOL buffer for network fees)
    if (balance < EVENT_CREATION_FEE + 0.001) {
      showError(`Insufficient balance. You need ${EVENT_CREATION_FEE} SOL + network fees to create an event. Current balance: ${balance.toFixed(4)} SOL`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Process payment
      logger.log('Processing payment...');
      setIsProcessingPayment(true);

      try {
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: PLATFORM_WALLET,
            lamports: Math.floor(EVENT_CREATION_FEE * LAMPORTS_PER_SOL),
          })
        );

        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        logger.log('Requesting wallet signature...');

        // Sign transaction (wallet popup opens here)
        let signedTransaction;
        try {
          if (!signTransaction) {
            throw new Error('Wallet does not support transaction signing');
          }
          signedTransaction = await signTransaction(transaction);
          logger.log('Transaction signed successfully');
        } catch (signError: unknown) {
          logger.error('Signature error:', signError);
          if ((signError as Error).message?.includes('User rejected') ||
              (signError as Error).message?.includes('Plugin Closed') ||
              (signError as Error).message?.includes('User closed')) {
            throw new Error('Transaction cancelled. Please try again and approve the transaction in your wallet.');
          }
          throw signError;
        }

        // Send the signed transaction
        logger.log('Sending signed transaction...');
        const rawTransaction = signedTransaction.serialize();
        const signature = await connection.sendRawTransaction(rawTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        logger.log('Transaction sent, waiting for confirmation...', signature);

        // Wait for confirmation with timeout
        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, 'confirmed');

        logger.log('Payment successful!', signature);
        showSuccess(`Payment of ${EVENT_CREATION_FEE} SOL confirmed!`);
      } catch (paymentError) {
        logger.error('Payment failed:', paymentError);
        let errorMsg = 'Payment failed';

        if (paymentError instanceof Error) {
          if (paymentError.message.includes('User rejected') || paymentError.message.includes('Plugin Closed')) {
            errorMsg = 'Transaction cancelled. Please try again and approve the transaction in your wallet.';
          } else {
            errorMsg = paymentError.message;
          }
        }

        showError(errorMsg);
        setIsProcessingPayment(false);
        setIsSubmitting(false);
        return;
      }

      setIsProcessingPayment(false);

      // Step 2: Upload image if selected
      let imageUrl = formData.imageUrl;
      if (selectedImage) {
        setIsUploadingImage(true);
        try {
          const uploadResponse = await uploadAPI.uploadImage(selectedImage, token);
          imageUrl = uploadResponse.url;
          logger.log('Image uploaded successfully:', imageUrl);
        } catch (uploadError) {
          logger.error('Failed to upload image:', uploadError);
          showError('Failed to upload image. Please try again.');
          setIsUploadingImage(false);
          setIsSubmitting(false);
          return;
        }
        setIsUploadingImage(false);
      }

      // Step 3: Create event with uploaded image URL
      const eventData = { ...formData, imageUrl };
      await eventsAPI.createEvent(eventData, token);
      showSuccess('Event created successfully!');

      // Refresh balance
      const newLamports = await connection.getBalance(publicKey);
      setBalance(newLamports / LAMPORTS_PER_SOL);

      router.push(`/events/manage`);
    } catch (error: unknown) {
      logger.error('Failed to create event:', error);
      showError((error as Error).message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--color-background)] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[var(--color-background)] via-[var(--color-surface)] to-[var(--color-background)]">
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[var(--color-surface)]/25 to-[var(--color-surface)]/35" />
      </div>
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-to-br from-korus-primary/8 to-korus-secondary/6 rounded-full blur-[80px]" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-korus-secondary/6 to-korus-primary/8 rounded-full blur-[70px]" />
      </div>

      <div className="relative z-10">
        <div className="flex min-h-screen max-w-[1280px] mx-auto">
          <LeftSidebar
            onNotificationsToggle={() => setShowNotifications(!showNotifications)}
            onPostButtonClick={() => setShowCreatePostModal(true)}
            onSearchClick={() => setShowSearchModal(true)}
          />

          {/* Main Content */}
          <div className="flex-1 min-w-0 border-x border-[var(--color-border-light)]">

            {/* Header */}
            <div className="sticky top-0 bg-[var(--color-surface)]/80 backdrop-blur-xl border-b border-[var(--color-border-light)] z-10 px-6 py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5 text-[var(--color-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-semibold text-[var(--color-text)]">Create Event</h1>
                  <p className="text-[var(--color-text-secondary)] text-sm">Submit your whitelist or community event</p>
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-6 py-8">
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Event Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value as unknown)}
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  >
                    <option value="whitelist">Whitelist</option>
                    <option value="token_launch">Token Launch</option>
                    <option value="nft_mint">NFT Mint</option>
                    <option value="airdrop">Airdrop</option>
                    <option value="ido">IDO</option>
                  </select>
                </div>

                {/* Project Name */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Project Name *</label>
                  <input
                    type="text"
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    placeholder="e.g., SolanaMonkeys"
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  />
                </div>

                {/* Event Title */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g., Exclusive Whitelist for Gen 2 Mint"
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your event, what participants will get, and any important details..."
                    rows={5}
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none resize-none"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Event Image (optional)</label>

                  {!imagePreview ? (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[var(--color-border-light)] rounded-lg cursor-pointer bg-white/[0.06] hover:bg-white/[0.08] duration-150 group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-12 h-12 mb-3 text-[var(--color-text-tertiary)] group-hover:text-korus-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mb-2 text-sm text-[var(--color-text-secondary)]">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-[var(--color-text-tertiary)]">PNG, JPG, GIF up to 5MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                  ) : (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Event preview"
                        className="w-full h-64 object-cover rounded-xl border border-[var(--color-border-light)]"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-3 right-3 w-8 h-8 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Upload a banner image for your event</p>
                </div>

                {/* External Link */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">External Link *</label>
                  <input
                    type="text"
                    value={formData.externalLink}
                    onChange={(e) => handleInputChange('externalLink', e.target.value)}
                    placeholder="https://your-project.com or www.korus.fun"
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Link to your project website or mint page (with or without https://)</p>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Start Date *</label>
                    <input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">End Date *</label>
                    <input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                    />
                  </div>
                </div>

                {/* Selection Method */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Selection Method *</label>
                  <select
                    value={formData.selectionMethod}
                    onChange={(e) => handleInputChange('selectionMethod', e.target.value as unknown)}
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  >
                    <option value="fcfs">First Come First Serve</option>
                    <option value="lottery">Lottery (Random Selection)</option>
                  </select>
                </div>

                {/* Max Spots */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Max Spots (optional)</label>
                  <input
                    type="number"
                    value={formData.maxSpots || ''}
                    onChange={(e) => handleInputChange('maxSpots', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Leave empty for unlimited"
                    className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                  />
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Requirements (optional)</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={requirementInput}
                      onChange={(e) => setRequirementInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
                      placeholder="e.g., Hold 1 Gen 1 NFT"
                      className="flex-1 bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] placeholder-neutral-600 focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                    />
                    <button
                      type="button"
                      onClick={addRequirement}
                      className="px-6 bg-white/[0.08] border border-[var(--color-border-light)] text-[var(--color-text)] rounded-lg hover:bg-white/[0.12] duration-150 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {formData.requirements && formData.requirements.length > 0 && (
                    <div className="space-y-2">
                      {formData.requirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-2 bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2">
                          <span className="text-korus-primary">✓</span>
                          <span className="flex-1 text-sm text-[var(--color-text)]">{req}</span>
                          <button
                            type="button"
                            onClick={() => removeRequirement(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                <div className="border border-[var(--color-border-light)] rounded-xl p-4 bg-[var(--color-surface)]">
                  <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Advanced Settings (optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Min Reputation Score</label>
                      <input
                        type="number"
                        value={formData.minReputation || ''}
                        onChange={(e) => handleInputChange('minReputation', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] text-sm focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Min Account Age (days)</label>
                      <input
                        type="number"
                        value={formData.minAccountAge || ''}
                        onChange={(e) => handleInputChange('minAccountAge', e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-full bg-white/[0.06] border border-[var(--color-border-light)] rounded-lg px-3 py-2.5 text-[var(--color-text)] text-sm focus:border-korus-primary/50 focus:ring-1 focus:ring-korus-primary/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="white-text border border-korus-primary/30 rounded-xl p-4 bg-gradient-to-br from-korus-primary/5 to-korus-secondary/5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-korus-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-5 h-5 text-korus-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">Event Creation Fee</h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                        Creating events requires a {EVENT_CREATION_FEE} SOL payment to prevent spam and ensure quality submissions.
                      </p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[var(--color-text-secondary)]">Creation Fee:</span>
                        <span className="font-bold text-korus-primary">{EVENT_CREATION_FEE} SOL</span>
                      </div>
                      {connected && publicKey && (
                        <div className="flex justify-between items-center text-sm mt-2 pt-2 border-t border-[var(--color-border-light)]">
                          <span className="text-[var(--color-text-secondary)]">Your Balance:</span>
                          <span className={`font-bold ${balance >= EVENT_CREATION_FEE + 0.001 ? 'text-green-400' : 'text-red-400'}`}>
                            {balance.toFixed(4)} SOL
                          </span>
                        </div>
                      )}

                      {/* Non-Refundable Warning */}
                      <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <p className="text-xs text-yellow-300 font-semibold mb-1">Important: Non-Refundable Fee</p>
                            <p className="text-xs text-yellow-200/80">
                              Event creation fees are <strong className="text-yellow-300">non-refundable</strong>, even if you cancel the event later. Please ensure all details are correct before submitting.
                            </p>
                          </div>
                        </div>
                      </div>

                      {connected && publicKey && balance < EVENT_CREATION_FEE + 0.001 && (
                        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                          <p className="text-xs text-red-400">
                            ⚠️ Insufficient balance. You need at least {EVENT_CREATION_FEE} SOL + network fees.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="flex-1 bg-white/[0.08] border border-[var(--color-border-light)] text-[var(--color-text)] font-semibold py-3 rounded-lg hover:bg-white/[0.12] duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage || isProcessingPayment || !connected || !isAuthenticated || (balance < EVENT_CREATION_FEE + 0.001)}
                    className="flex-1 bg-gradient-to-r from-korus-primary to-korus-secondary text-black font-semibold py-3 rounded-lg hover:shadow-lg hover:shadow-korus-primary/20 duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Processing Payment...
                      </div>
                    ) : isUploadingImage ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Uploading Image...
                      </div>
                    ) : isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                        Creating Event...
                      </div>
                    ) : (
                      `Create Event (${EVENT_CREATION_FEE} SOL)`
                    )}
                  </button>
                </div>

                {!connected && (
                  <p className="text-center text-sm text-[var(--color-text-secondary)]">
                    Please connect your wallet to create an event
                  </p>
                )}
              </form>
            </div>
          </div>

          <RightSidebar
            showNotifications={showNotifications}
            onNotificationsClose={() => setShowNotifications(false)}
          />
        </div>
      </div>

      {/* Modals */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        allPosts={[]}
      />

      <CreatePostModal
        isOpen={showCreatePostModal}
        onClose={() => setShowCreatePostModal(false)}
        onPostCreate={() => {
          showSuccess('Post created successfully!');
          setShowCreatePostModal(false);
        }}
      />

      <MobileMenuModal
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
      />
    </main>
  );
}
