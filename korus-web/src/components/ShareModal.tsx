'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postContent: string;
  postUser: string;
}

export default function ShareModal({ isOpen, onClose, postId, postContent, postUser }: ShareModalProps) {
  const { showSuccess, showError } = useToast();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const postUrl = `${window.location.origin}/post/${postId}`;

  // Truncate content for sharing
  const truncatedContent = postContent.length > 100
    ? postContent.substring(0, 100) + '...'
    : postContent;

  const shareOptions = [
    {
      name: 'Copy Link',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      action: async () => {
        try {
          await navigator.clipboard.writeText(postUrl);
          setCopied(true);
          showSuccess('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } catch (error) {
          showError('Failed to copy link');
        }
      },
      color: 'text-blue-400',
      hoverColor: 'hover:bg-blue-500/10 hover:border-blue-500/30'
    },
    {
      name: 'Twitter',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      ),
      action: () => {
        const text = `Check out this post by ${postUser}: "${truncatedContent}"`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(postUrl)}`;
        window.open(url, '_blank');
      },
      color: 'text-sky-400',
      hoverColor: 'hover:bg-sky-500/10 hover:border-sky-500/30'
    },
    {
      name: 'Telegram',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      action: () => {
        const text = `Check out this post by ${postUser}: "${truncatedContent}"`;
        const url = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
      },
      color: 'text-cyan-400',
      hoverColor: 'hover:bg-cyan-500/10 hover:border-cyan-500/30'
    },
    {
      name: 'Discord',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ),
      action: async () => {
        try {
          await navigator.clipboard.writeText(`Check out this post by ${postUser}: "${truncatedContent}" ${postUrl}`);
          showSuccess('Message copied! Paste it in Discord.');
        } catch (error) {
          showError('Failed to copy message');
        }
      },
      color: 'text-indigo-400',
      hoverColor: 'hover:bg-indigo-500/10 hover:border-indigo-500/30'
    },
    {
      name: 'WhatsApp',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
        </svg>
      ),
      action: () => {
        const text = `Check out this post by ${postUser}: "${truncatedContent}"`;
        const url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + postUrl)}`;
        window.open(url, '_blank');
      },
      color: 'text-green-400',
      hoverColor: 'hover:bg-green-500/10 hover:border-green-500/30'
    },
    {
      name: 'Reddit',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
        </svg>
      ),
      action: () => {
        const title = `Post by ${postUser} on Korus`;
        const url = `https://www.reddit.com/submit?url=${encodeURIComponent(postUrl)}&title=${encodeURIComponent(title)}`;
        window.open(url, '_blank');
      },
      color: 'text-orange-400',
      hoverColor: 'hover:bg-orange-500/10 hover:border-orange-500/30'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-korus-surface/95 backdrop-blur-xl rounded-2xl max-w-md w-full border border-korus-border shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-korus-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #43E97B, #38EF7D)', boxShadow: '0 10px 15px -3px rgba(67, 233, 123, 0.4)' }}>
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Share Post</h2>
              <p className="text-sm text-korus-textSecondary">by {postUser}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-korus-surface/60 text-korus-textSecondary hover:text-white transition-all duration-200"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Post Preview */}
        <div className="p-5">
          <div className="p-4 rounded-xl border-2" style={{ background: 'linear-gradient(90deg, rgba(67, 233, 123, 0.1), rgba(56, 239, 125, 0.1))', borderColor: 'rgba(67, 233, 123, 0.3)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black" style={{ background: 'linear-gradient(135deg, #43E97B, #38EF7D)' }}>
                {postUser.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-white font-medium">{postUser}</span>
            </div>
            <p className="text-korus-text text-sm leading-relaxed line-clamp-3">
              {truncatedContent}
            </p>
          </div>
        </div>

        {/* Share Options */}
        <div className="p-5 space-y-5">
          <div>
            <h3 className="text-sm font-medium text-white mb-3">Share to</h3>
            <div className="grid grid-cols-2 gap-2">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={option.action}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'rgba(26, 26, 26, 0.4)',
                    borderColor: 'rgba(67, 233, 123, 0.2)'
                  }}
                >
                  <div className={`${option.color}`}>
                    {option.icon}
                  </div>
                  <span className="text-white font-medium text-sm">
                    {option.name === 'Copy Link' && copied ? 'Copied!' : option.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Direct Link */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Direct Link</h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={postUrl}
                readOnly
                className="flex-1 bg-korus-surface/40 text-korus-textSecondary text-sm px-3 py-2.5 rounded-lg border border-korus-borderLight focus:outline-none"
              />
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(postUrl);
                    setCopied(true);
                    showSuccess('Link copied!');
                    setTimeout(() => setCopied(false), 2000);
                  } catch (error) {
                    showError('Failed to copy');
                  }
                }}
                className="px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #43E97B, #38EF7D)', color: '#000000' }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}