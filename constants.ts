
export const APP_TITLE = "ApeChain Live NFT Mints";

// --- Public RPC Configuration for ApeChain Network ---
export const PUBLIC_APECHAIN_HTTP_RPC_URLS = [
  'https://rpc.apechain.com/http',
  'https://apechain.calderachain.xyz/http',
  'https://33139.rpc.thirdweb.com', 
  'https://apechain.drpc.org',
  'https://node.histori.xyz/apechain-mainnet/8ry9f6t9dct1se2hlagxnd9n2a',
  'https://apechain-mainnet.public.blastapi.io',
];

export const PUBLIC_APECHAIN_WSS_RPC_URLS = [
  'wss://rpc.apechain.com/ws',
  'wss://apechain.calderachain.xyz/ws',
  'wss://apechain.drpc.org',
  'wss://rpc.curtis.apechain.com/ws',
];

export const APECHAIN_EXPLORER_URL = "https://apechain.calderaexplorer.xyz";
export const APE_COIN_DECIMALS = 18;

// --- Marketplace URL Prefixes ---
export const APECHAIN_MAGICKEDEN_COLLECTION_URL_PREFIX = "https://magiceden.io/collections/apechain/";


// Maximum block range for eth_getLogs requests
export const GETLOGS_MAX_BLOCK_RANGE = 499; 

// --- Retry Logic Configuration ---
export const RETRY_ATTEMPTS = 3; 
export const RETRY_DELAY_MS = 1000; 

// --- Blockchain & Contract Constants ---
export const ERC721_TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ERC721_INTERFACE_ID = '0x80ac58cd';
export const ERC165_ABI = [
  "function supportsInterface(bytes4 interfaceId) external view returns (bool)"
];
export const MINIMAL_ERC721_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
];
export const ERC721_METADATA_ABI = [
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function tokenURI(uint256 tokenId) external view returns (string)"
];


export const MAX_TOKEN_ID = 10000; 
export const MAX_DISPLAY_MINTS = 100;

// --- Scan Duration Configuration ---
export const BLOCKS_PER_MINUTE_ESTIMATE = 30; 
export const SCAN_DURATION_MINUTES = 0; 

// --- Local Storage ---
export const LOCAL_STORAGE_KEY = 'apechainNftMintTrackerData_v4';
export const LIVE_FREE_MINTS_CACHE_KEY = 'apechainLiveFreeMintsCache_v1';
export const LIVE_PAID_MINTS_CACHE_KEY = 'apechainLivePaidMintsCache_v1';
export const ANALYSIS_RESULTS_CACHE_KEY = 'apechainAnalysisCache_v4'; 
export const TABLE_DATA_CACHE_KEY = 'apechainTableDataCache_v5'; 
export const PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY = 'apechainPlayedNotificationsCache_v1'; 


// --- Collection Analyzer Constants ---
export const ANALYSIS_CACHE_DURATION_MS = 10 * 60 * 1000;

// --- Scrolling Advertisement Banner ---
export const ADVERTISEMENT_TEXT = "Want to advertise your NFT? Contact @YourTwitterID for promotion!"; // Replace @YourTwitterID
// IMPORTANT: Replace YOUR_NUMERIC_TWITTER_ID_HERE with your actual numeric Twitter User ID for DM to work.
// You can find your numeric ID using services like https://tweeterid.com/
export const ADVERTISEMENT_LINK = "https://twitter.com/messages/compose?recipient_id=YOUR_NUMERIC_TWITTER_ID_HERE"; 

// --- Static NFT Advertisement Poster Details ---
export interface NftAdDetails {
  imageUrl: string;
  name: string;
  supply: string;
  price: string;
  mintLink: string;
  accentColor: 'sky' | 'fuchsia' | 'emerald' | 'amber' | 'rose'; // Example accent colors
  active: boolean; // To easily toggle the ad
}

export const NFT_ADVERTISEMENT_DETAILS: NftAdDetails = {
  imageUrl: 'https://picsum.photos/seed/nftad/400/400', // Replace with actual NFT image URL
  name: 'Example Ape NFT Ad',
  supply: 'Supply: 3333',
  price: 'Price: FREE', // Or "0.05 APE", etc.
  mintLink: '#mint-your-nft-here', // Replace with actual mint link
  accentColor: 'fuchsia',
  active: true, 
};

// Spacing for fixed elements at the top
export const APP_MAIN_TITLE_HEIGHT_PX = 70; // Height for the main "ApeChain Live NFT Mints" title
export const SCROLLING_BANNER_HEIGHT_PX = 50;
export const NFT_AD_POSTER_HEIGHT_PX = 150; 

export const calculateBodyPaddingTop = () => {
  let padding = APP_MAIN_TITLE_HEIGHT_PX + SCROLLING_BANNER_HEIGHT_PX;
  if (NFT_ADVERTISEMENT_DETAILS.active) {
    padding += NFT_AD_POSTER_HEIGHT_PX;
  }
  return padding;
};