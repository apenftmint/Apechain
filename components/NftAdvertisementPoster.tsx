
import React from 'react';
import { NftAdDetails, NFT_AD_POSTER_HEIGHT_PX, APP_MAIN_TITLE_HEIGHT_PX, SCROLLING_BANNER_HEIGHT_PX } from '../constants';

interface NftAdvertisementPosterProps {
  adDetails: NftAdDetails;
}

const NftAdvertisementPoster: React.FC<NftAdvertisementPosterProps> = ({ adDetails }) => {
  if (!adDetails.active) {
    return null;
  }

  const accentColorClasses = {
    sky: {
      bgGradient: 'from-sky-500 to-cyan-600',
      buttonBg: 'bg-sky-500 hover:bg-sky-600',
      borderColor: 'border-sky-400',
      textColor: 'text-sky-300',
      shadow: 'shadow-sky-500/50',
    },
    fuchsia: {
      bgGradient: 'from-fuchsia-600 to-pink-600',
      buttonBg: 'bg-fuchsia-500 hover:bg-fuchsia-600',
      borderColor: 'border-fuchsia-500',
      textColor: 'text-fuchsia-300',
      shadow: 'shadow-fuchsia-500/50',
    },
    emerald: {
      bgGradient: 'from-emerald-500 to-green-600',
      buttonBg: 'bg-emerald-500 hover:bg-emerald-600',
      borderColor: 'border-emerald-400',
      textColor: 'text-emerald-300',
      shadow: 'shadow-emerald-500/50',
    },
    amber: {
      bgGradient: 'from-amber-500 to-yellow-600',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      borderColor: 'border-amber-400',
      textColor: 'text-amber-300',
      shadow: 'shadow-amber-500/50',
    },
     rose: {
      bgGradient: 'from-rose-500 to-red-600',
      buttonBg: 'bg-rose-500 hover:bg-rose-600',
      borderColor: 'border-rose-400',
      textColor: 'text-rose-300',
      shadow: 'shadow-rose-500/50',
    },
  };

  const selectedTheme = accentColorClasses[adDetails.accentColor] || accentColorClasses.sky;
  const posterTopPosition = APP_MAIN_TITLE_HEIGHT_PX + SCROLLING_BANNER_HEIGHT_PX;

  return (
    <div 
      className={`nft-ad-poster fixed left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-br ${selectedTheme.bgGradient} text-white shadow-2xl flex flex-col sm:flex-row items-center justify-around transition-all duration-300 ease-in-out transform hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]`}
      style={{ 
        height: `${NFT_AD_POSTER_HEIGHT_PX}px`,
        top: `${posterTopPosition}px` // Position below main title and scrolling banner
      }} 
    >
      <div className="flex-shrink-0 mb-2 sm:mb-0 sm:mr-4 transform transition-transform duration-300 ease-out">
        <img 
          src={adDetails.imageUrl} 
          alt={`${adDetails.name} NFT Image`}
          className="nft-ad-image w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-xl object-cover border-2 border-white/40 shadow-lg transition-transform duration-300 ease-out" 
        />
      </div>
      <div className="text-center sm:text-left flex-grow mx-2">
        <h2 className={`text-xl sm:text-2xl md:text-3xl font-extrabold mb-1 drop-shadow-md ${selectedTheme.textColor} brightness-125`}>
          {adDetails.name}
        </h2>
        <p className="text-xs sm:text-sm text-slate-100 mb-0.5">
          {adDetails.supply}
        </p>
        <p className={`text-md sm:text-lg font-bold mb-1 sm:mb-2 ${adDetails.price.toLowerCase() === 'free' ? 'text-green-300' : selectedTheme.textColor }`}>
          {adDetails.price}
        </p>
      </div>
      <div className="flex-shrink-0 mt-2 sm:mt-0 sm:ml-4">
        <a
          href={adDetails.mintLink}
          target="_blank"
          rel="noopener noreferrer"
          className={`nft-ad-button inline-block px-4 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-bold text-white ${selectedTheme.buttonBg} rounded-lg shadow-md hover:shadow-xl ${selectedTheme.shadow} transition-all duration-300 ease-out transform hover:-translate-y-0.5`}
          aria-label={`Mint ${adDetails.name} now`}
        >
          Mint Now!
        </a>
      </div>
    </div>
  );
};

export default NftAdvertisementPoster;