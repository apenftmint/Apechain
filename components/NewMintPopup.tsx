
import React, { useEffect, useState } from 'react';
import { PopupMintData } from '../App'; // Changed to PopupMintData
import { APECHAIN_EXPLORER_URL, APECHAIN_MAGICKEDEN_COLLECTION_URL_PREFIX, APE_COIN_DECIMALS } from '../constants';
import { formatUnits } from 'ethers';
import ConfettiEffect from './ConfettiEffect';

interface NewMintPopupProps {
  mint: PopupMintData; // Use the PopupMintData which includes popupId
  onClose: () => void;
}

const NewMintPopup: React.FC<NewMintPopupProps> = ({ mint, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    setShowConfetti(true); 
    
    const visibilityTimer = setTimeout(() => {
      handleClose(); // This will trigger CSS exit animation
    }, 60000); // Popup is visible for 60 seconds

    // Confetti will naturally stop based on its CSS animation or when the component unmounts.
    // No need for a separate confetti timer if ConfettiEffect's animation is set to ~60s.

    return () => {
        clearTimeout(visibilityTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint.popupId]); // Depend on popupId to re-trigger if a new mint object (with new ID) is passed

  const handleClose = () => {
    setIsVisible(false); // Start exit animation
    // Confetti will stop when component unmounts or its animation ends.
    // Let parent remove from DOM after animation.
    setTimeout(onClose, 400); // Allow time for CSS exit animation before calling parent's onClose
  };
  
  const collectionDisplayName = (mint.analysis?.collectionNameFromAnalyzer && mint.analysis.collectionNameFromAnalyzer !== "Unknown Collection" && mint.analysis.collectionNameFromAnalyzer !== "Unnamed Collection")
                                ? mint.analysis.collectionNameFromAnalyzer
                                : mint.collectionName;

  const explorerTxUrl = `${APECHAIN_EXPLORER_URL}/tx/${mint.txHash}`;
  const magicEdenCollectionUrl = `${APECHAIN_MAGICKEDEN_COLLECTION_URL_PREFIX}${mint.contractAddress}`;
  // const mintPriceDisplay = mint.isFree || !mint.valueWei // This was in old AppTableDisplayMintData, popup is only for free
  //   ? "Free Mint!"
  //   : `${parseFloat(formatUnits(mint.valueWei, APE_COIN_DECIMALS)).toFixed(4)} APE`;


  return (
    <div 
      className={`fixed top-5 right-5 z-[100] transition-all duration-500 transform ${isVisible ? 'popup-top-right-enter-active' : 'popup-top-right-enter'}`}
      role="alert"
      aria-live="assertive"
      style={{ opacity: isVisible ? 1 : 0 }} // Control final fade via isVisible
    >
      <div 
        className="bg-gradient-to-br from-green-500 via-teal-500 to-sky-600 p-4 rounded-xl shadow-2xl border-2 border-yellow-400/80 text-white max-w-xs w-full relative overflow-hidden"
        style={{
            transformStyle: 'preserve-3d',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25), 0 0 0 2px rgba(250, 204, 21, 0.7)' // yellow-400
        }}
      >
        {showConfetti && <ConfettiEffect count={50} />} {/* count can be adjusted */}
        <button 
          onClick={handleClose}
          className="absolute top-1.5 right-2.5 text-yellow-200 hover:text-white transition-colors text-2xl z-20"
          aria-label="Close new free mint notification"
        >
          &times;
        </button>

        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-white to-yellow-300">
            🎉 New Free Mint! 🎉
          </h2>
        </div>

        <div className="flex items-center space-x-3 mb-2">
            <img 
              src={mint.tokenImagePlaceholderUrl} 
              alt="NFT Placeholder" 
              className="w-12 h-12 rounded-md object-cover border border-slate-400 shadow-md"
            />
            <div>
                <h3 className="text-md font-semibold text-yellow-100 break-words">
                    {collectionDisplayName}
                </h3>
                <p className="text-lg font-bold text-white">
                    ID: {mint.tokenId}
                </p>
            </div>
        </div>
        
        <p className="text-sm text-slate-200 mb-1 text-xs">
          Minted: {new Date(mint.timestamp * 1000).toLocaleTimeString()}
        </p>
         <p className="text-xs text-slate-300 mb-3 truncate" title={mint.contractAddress}>
          Contract: {truncateAddress(mint.contractAddress)}
        </p>

        <div className="flex justify-around items-center mt-2 pt-2 border-t border-yellow-400/50">
          <a 
            href={explorerTxUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-white text-xs font-semibold rounded-md shadow transition-all duration-200 transform hover:scale-105"
          >
            View Tx
          </a>
          <a 
            href={magicEdenCollectionUrl}
            target="_blank" 
            rel="noopener noreferrer" 
            className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-white text-xs font-semibold rounded-md shadow transition-all duration-200 transform hover:scale-105"
          >
            View on ME
          </a>
        </div>
      </div>
    </div>
  );
};

const truncateAddress = (address: string) => `${address.slice(0, 5)}...${address.slice(-3)}`;

export default NewMintPopup;