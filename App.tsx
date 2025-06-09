
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatUnits } from 'ethers';
import { MintData, CollectionAnalysisResult, FinalCollectionStatus } from './types';
import { blockchainService } from './services/blockchainService';
import { CollectionAnalyzerService } from './services/collectionAnalyzerService';
import MintCard from './components/MintCard';
import LoadingSpinner from './components/LoadingSpinner';
import MintsTable from './components/MintsTable';
import AdvertisementBanner from './components/AdvertisementBanner';
import NftAdvertisementPoster from './components/NftAdvertisementPoster';
import NewMintPopup from './components/NewMintPopup';
import LiveVisitorsCounter from './components/LiveVisitorsCounter';
import { 
    MAX_DISPLAY_MINTS, 
    APP_TITLE, 
    LOCAL_STORAGE_KEY,
    PUBLIC_APECHAIN_HTTP_RPC_URLS, 
    ANALYSIS_CACHE_DURATION_MS,
    ANALYSIS_RESULTS_CACHE_KEY, 
    TABLE_DATA_CACHE_KEY, 
    PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY, 
    APE_COIN_DECIMALS,
    LIVE_FREE_MINTS_CACHE_KEY,
    LIVE_PAID_MINTS_CACHE_KEY,
    ADVERTISEMENT_TEXT,
    ADVERTISEMENT_LINK,
    NFT_ADVERTISEMENT_DETAILS,
    calculateBodyPaddingTop
} from './constants';

export interface AppTableDisplayMintData extends MintData { 
  totalContractMints: number; 
  analysis?: CollectionAnalysisResult; 
  displayStatus: FinalCollectionStatus; 
  mintPriceApe?: string; 
}

export interface PopupMintData extends AppTableDisplayMintData {
    popupId: string;
}

const App: React.FC = () => {
  const [liveFreeMints, setLiveFreeMints] = useState<MintData[]>([]);
  const [livePaidMints, setLivePaidMints] = useState<MintData[]>([]);
  const [allTimeMints, setAllTimeMints] = useState<MintData[]>([]); 
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [providerOk, setProviderOk] = useState<boolean>(false);
  
  const [userInteracted, setUserInteracted] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false); 

  const [tableData, setTableData] = useState<AppTableDisplayMintData[]>([]);
  const [tableFilter, setTableFilter] = useState<'all' | 'free' | 'paid'>('all'); 
  const [isFetchingTableData, setIsFetchingTableData] = useState<boolean>(false);
  const [tableItemsPerPage, setTableItemsPerPage] = useState<number>(10);
  const [currentTablePage, setCurrentTablePage] = useState<number>(1); 

  const [activePopups, setActivePopups] = useState<PopupMintData[]>([]);

  const isInitialLoadRef = useRef(true); 
  const firstDataLoadCompleteRef = useRef(false); 
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimeoutRef = useRef<number | null>(null);
  const playedNotificationForContractsRef = useRef(new Set<string>());

  const collectionAnalyzerRef = useRef<CollectionAnalyzerService | null>(null);
  const analysisCacheRef = useRef<Map<string, { result: CollectionAnalysisResult; timestamp: number; tokenIdsHash: string }>>(new Map());
  const [analysisStatusMap, setAnalysisStatusMap] = useState<Map<string, 'pending' | 'analyzing' | 'done' | 'error'>>(new Map());

  useEffect(() => {
    document.body.style.paddingTop = `${calculateBodyPaddingTop()}px`;
  }, []);


  useEffect(() => {
    if (!collectionAnalyzerRef.current) {
        collectionAnalyzerRef.current = new CollectionAnalyzerService(PUBLIC_APECHAIN_HTTP_RPC_URLS); 
    }

    try {
      const storedAllTimeMintsRaw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedAllTimeMintsRaw) {
        const storedMints: MintData[] = JSON.parse(storedAllTimeMintsRaw);
        storedMints.sort((a,b) => b.timestamp - a.timestamp); 
        setAllTimeMints(storedMints);
      }

      const storedLiveFreeMintsRaw = localStorage.getItem(LIVE_FREE_MINTS_CACHE_KEY);
      if (storedLiveFreeMintsRaw) {
          const stored: MintData[] = JSON.parse(storedLiveFreeMintsRaw);
          setLiveFreeMints(stored.sort((a,b) => b.timestamp - a.timestamp).slice(0, MAX_DISPLAY_MINTS));
      }
      const storedLivePaidMintsRaw = localStorage.getItem(LIVE_PAID_MINTS_CACHE_KEY);
      if (storedLivePaidMintsRaw) {
          const stored: MintData[] = JSON.parse(storedLivePaidMintsRaw);
          setLivePaidMints(stored.sort((a,b) => b.timestamp - a.timestamp).slice(0, MAX_DISPLAY_MINTS));
      }
      
      const storedAnalysisCacheRaw = localStorage.getItem(ANALYSIS_RESULTS_CACHE_KEY);
      if (storedAnalysisCacheRaw) {
        const deserializedCacheArray = JSON.parse(storedAnalysisCacheRaw) as [string, { result: CollectionAnalysisResult; timestamp: number; tokenIdsHash: string }][];
        analysisCacheRef.current = new Map(deserializedCacheArray);
      }

      const storedTableDataRaw = localStorage.getItem(TABLE_DATA_CACHE_KEY);
      if (storedTableDataRaw) {
          const storedTableData: AppTableDisplayMintData[] = JSON.parse(storedTableDataRaw);
          setTableData(storedTableData);
      }

      const storedPlayedNotificationsRaw = localStorage.getItem(PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY); 
      if (storedPlayedNotificationsRaw) {
          try {
              const storedPlayedNotificationsArray: string[] = JSON.parse(storedPlayedNotificationsRaw);
              playedNotificationForContractsRef.current = new Set(storedPlayedNotificationsArray);
          } catch (e) {
              console.error("Failed to load or parse played notifications cache from localStorage:", e);
              localStorage.removeItem(PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY);
          }
      }

      const storedSoundPref = localStorage.getItem('apechainSoundEnabledPreference_v3'); 
      if (storedSoundPref !== null) {
        setSoundEnabled(storedSoundPref === 'true');
      } else {
        setSoundEnabled(false); 
        localStorage.setItem('apechainSoundEnabledPreference_v3', 'false');
      }
    } catch (e) {
      console.error("Failed to load or parse data from localStorage:", e);
      [LOCAL_STORAGE_KEY, LIVE_FREE_MINTS_CACHE_KEY, LIVE_PAID_MINTS_CACHE_KEY, 
       ANALYSIS_RESULTS_CACHE_KEY, TABLE_DATA_CACHE_KEY, PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY, 
       'apechainSoundEnabledPreference_v3'].forEach(key => localStorage.removeItem(key));
    }
  }, []);

  const handleError = useCallback((errorMessage: string, isRateLimit: boolean = false) => {
    console.error("App Error:", errorMessage, "Is Rate Limit:", isRateLimit);
    if (isRateLimit) {
      setRateLimitWarning(prev => (prev && prev.includes("Rate limit") ? prev : errorMessage));
    } else {
      setError(prevError => (prevError === errorMessage && errorMessage !== null ? prevError : errorMessage));
      if (!isRateLimit) setRateLimitWarning(null); 
    }
  }, []);

  const handleNewMint = useCallback((newMint: MintData) => {
    if (newMint.isFree) {
        setLiveFreeMints(prevMints => {
            const isDuplicateLive = prevMints.some(m => m.txHash === newMint.txHash && m.logIndex === newMint.logIndex);
            if (isDuplicateLive) return prevMints;
            const updated = [newMint, ...prevMints].slice(0, MAX_DISPLAY_MINTS);
            try { localStorage.setItem(LIVE_FREE_MINTS_CACHE_KEY, JSON.stringify(updated)); } 
            catch (e) { console.error("Error saving live free mints to localStorage:", e); }
            return updated;
        });
    } else {
        setLivePaidMints(prevMints => {
            const isDuplicateLive = prevMints.some(m => m.txHash === newMint.txHash && m.logIndex === newMint.logIndex);
            if (isDuplicateLive) return prevMints;
            const updated = [newMint, ...prevMints].slice(0, MAX_DISPLAY_MINTS);
            try { localStorage.setItem(LIVE_PAID_MINTS_CACHE_KEY, JSON.stringify(updated)); }
            catch (e) { console.error("Error saving live paid mints to localStorage:", e); }
            return updated;
        });
    }

    setAllTimeMints(prevAllMints => {
      let updatedPersistedMints = [newMint, ...prevAllMints];
      const uniqueEventsMap = new Map<string, MintData>(); 
      for (const mint of updatedPersistedMints) {
          const key = `${mint.txHash}-${mint.logIndex}`; 
          if (!uniqueEventsMap.has(key) || newMint.timestamp > uniqueEventsMap.get(key)!.timestamp) {
              uniqueEventsMap.set(key, mint);
          }
      }
      updatedPersistedMints = Array.from(uniqueEventsMap.values());
      updatedPersistedMints.sort((a, b) => b.timestamp - a.timestamp); 

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedPersistedMints));
      } catch (e: any) {
        console.error("Error saving allTimeMints to localStorage:", e);
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
            const numToKeep = Math.floor(updatedPersistedMints.length * 0.8);
            const mintsToKeep = updatedPersistedMints.slice(0, numToKeep);
            try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(mintsToKeep));
                return mintsToKeep;
            } catch (pruningError) {
                console.error("Error saving pruned allTimeMints to localStorage:", pruningError);
                return prevAllMints; 
            }
        }
      }
      return updatedPersistedMints;
    });
    setError(null); 
  }, []);

  const handleSetupComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const initService = async () => {
      setIsLoading(true);
      setError(null);
      setRateLimitWarning(null);
      try {
        setProviderOk(true); 
        await blockchainService.listenForMints(handleNewMint, handleError, handleSetupComplete);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to start listening for mints.';
        handleError(`Initialization/Setup Error on ApeChain: ${errorMsg}`); 
        setProviderOk(false);
        setIsLoading(false); 
      }
    };
    initService();
    return () => {
      blockchainService.stopListeningForMints();
      if (typeof window.speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, [handleNewMint, handleError, handleSetupComplete]);

  const createTokenIdsHash = (tokenIds: string[]): string => {
    return tokenIds.sort().join(',');
  };

 useEffect(() => {
    const prepareTableData = async () => {
        if (!collectionAnalyzerRef.current) { 
            setIsFetchingTableData(false);
            if (isInitialLoadRef.current) firstDataLoadCompleteRef.current = true;
            return;
        }
        if (allTimeMints.length === 0 && tableData.length === 0 && !isLoading) {
            setTableData([]);
            setIsFetchingTableData(false);
            if (isInitialLoadRef.current) firstDataLoadCompleteRef.current = true;
            return;
        }
        setIsFetchingTableData(true);

        const twentyFourHoursAgoUnix = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

        const mintsByContract = new Map<string, MintData[]>(); 
        allTimeMints.forEach(mint => {
            if (!mintsByContract.has(mint.contractAddress)) {
                mintsByContract.set(mint.contractAddress, []);
            }
            mintsByContract.get(mint.contractAddress)!.push(mint);
        });

        const uniqueCollectionsMap = new Map<string, MintData>(); 
        for (const [contractAddress, mintsInContract] of mintsByContract.entries()) {
            if (mintsInContract.length > 0) {
                const sortedMints = mintsInContract.sort((a,b) => b.timestamp - a.timestamp);
                const latestMintTimestamp = sortedMints[0].timestamp;
                if (latestMintTimestamp >= twentyFourHoursAgoUnix) {
                    uniqueCollectionsMap.set(contractAddress, sortedMints[0]);
                }
            }
        }
        
        let initialFilteredReps = Array.from(uniqueCollectionsMap.values()); 

        if (initialFilteredReps.length === 0 && tableData.length === 0) { 
            setTableData([]);
            setIsFetchingTableData(false);
            if (isInitialLoadRef.current) firstDataLoadCompleteRef.current = true;
            return;
        }
        
        const newAnalysisStatusMap = new Map(analysisStatusMap);
        const analysisPromises: Promise<AppTableDisplayMintData>[] = [];

        for (const mintRep of initialFilteredReps) {
            const contractAddress = mintRep.contractAddress;
            const allTokenIdsForContract = (mintsByContract.get(contractAddress) || [])
                .map(m => m.tokenId); 

            if (allTokenIdsForContract.length === 0) continue;

            const currentTokenIdsHash = createTokenIdsHash(allTokenIdsForContract);
            const cached = analysisCacheRef.current.get(contractAddress);
            
            const mintPriceApe = mintRep.isFree || !mintRep.valueWei
                ? undefined
                : parseFloat(formatUnits(mintRep.valueWei, APE_COIN_DECIMALS)).toFixed(4);

            let promise: Promise<AppTableDisplayMintData>;

            if (cached && (Date.now() - cached.timestamp < ANALYSIS_CACHE_DURATION_MS) && cached.tokenIdsHash === currentTokenIdsHash) {
                promise = Promise.resolve({
                    ...mintRep,
                    totalContractMints: mintsByContract.get(contractAddress)?.length || 0,
                    analysis: cached.result,
                    displayStatus: cached.result.finalStatus,
                    mintPriceApe,
                });
            } else {
                newAnalysisStatusMap.set(contractAddress, 'analyzing');
                promise = collectionAnalyzerRef.current.analyzeCollection( 
                    contractAddress,
                    allTokenIdsForContract,
                    mintRep.tokenId
                ).then(analysisResult => {
                    analysisCacheRef.current.set(contractAddress, { result: analysisResult, timestamp: Date.now(), tokenIdsHash: currentTokenIdsHash });
                    try { 
                        localStorage.setItem(ANALYSIS_RESULTS_CACHE_KEY, JSON.stringify(Array.from(analysisCacheRef.current.entries())));
                    } catch (e) { console.error("Error saving analysis cache to localStorage:", e); }
                    
                    newAnalysisStatusMap.set(contractAddress, 'done');
                    return {
                        ...mintRep,
                        totalContractMints: mintsByContract.get(contractAddress)?.length || 0,
                        analysis: analysisResult,
                        displayStatus: analysisResult.finalStatus,
                        mintPriceApe,
                    };
                }).catch(err => {
                    console.error(`Error analyzing collection ${contractAddress}:`, err);
                    newAnalysisStatusMap.set(contractAddress, 'error');
                    return { 
                        ...mintRep,
                        totalContractMints: mintsByContract.get(contractAddress)?.length || 0,
                        analysis: undefined, 
                        displayStatus: 'ErrorAnalyzing' as FinalCollectionStatus,
                        mintPriceApe,
                    };
                });
            }
            analysisPromises.push(promise);
        }
        setAnalysisStatusMap(newAnalysisStatusMap);
        
        const results = await Promise.all(analysisPromises);

        const finalData = results
            .sort((a,b) => b.timestamp - a.timestamp);
       
        setTableData(finalData);
        try {
            localStorage.setItem(TABLE_DATA_CACHE_KEY, JSON.stringify(finalData));
        } catch (e: any) {
            console.error("Error saving tableData to localStorage:", e);
             if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                console.warn("LocalStorage quota exceeded while saving tableData. Consider clearing cache or reducing data size.");
            }
        }

        setIsFetchingTableData(false); 
        if (isInitialLoadRef.current) firstDataLoadCompleteRef.current = true;
    };

    prepareTableData();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [allTimeMints, isLoading]); 


 useEffect(() => {
    setTableData(prevTableData => {
        return prevTableData.map((item): AppTableDisplayMintData => { 
            const status = analysisStatusMap.get(item.contractAddress);
            const cachedAnalysisItem = analysisCacheRef.current.get(item.contractAddress);
            const cachedAnalysis = cachedAnalysisItem?.result;
            
            let newDisplayStatus = item.displayStatus;
            let newAnalysis = item.analysis;

            if (status === 'analyzing' && item.displayStatus !== 'Analyzing...') {
                newDisplayStatus = 'Analyzing...';
                newAnalysis = undefined; 
            } else if (status === 'done' && cachedAnalysis) {
                 newDisplayStatus = cachedAnalysis.finalStatus;
                 newAnalysis = cachedAnalysis;
            } else if (status === 'error' && item.displayStatus !== 'ErrorAnalyzing') {
                newDisplayStatus = 'ErrorAnalyzing';
                newAnalysis = undefined;
            }
            
            return { ...item, analysis: newAnalysis, displayStatus: newDisplayStatus };
        })
          .sort((a,b) => b.timestamp - a.timestamp);
    });
 }, [analysisStatusMap]);


 useEffect(() => {
    if (isInitialLoadRef.current && firstDataLoadCompleteRef.current) {
        isInitialLoadRef.current = false; 
    }

    if (!firstDataLoadCompleteRef.current || isInitialLoadRef.current) {
        if (!userInteracted && typeof window.speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
            speechSynthesis.cancel(); 
        }
        if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
        return;
    }
    
    let notificationProcessedForThisCycle = false; 
    let popupsAddedThisCycle = 0;

    for (const currentMint of tableData) {
        if (playedNotificationForContractsRef.current.has(currentMint.contractAddress)) {
            continue; 
        }
        
        const isStatusOK = currentMint.analysis?.finalStatus === 'OK';
        const isFreeMintForNotification = currentMint.isFree; 
        
        if (isFreeMintForNotification && isStatusOK) { 
            // --- Popup Logic (Always show if conditions met, after initial load) ---
            setActivePopups(prevPopups => {
                // Prevent duplicate popups for the exact same mint instance if this effect runs multiple times quickly
                if (prevPopups.some(p => p.txHash === currentMint.txHash && p.logIndex === currentMint.logIndex)) {
                    return prevPopups;
                }
                const newPopupId = `${currentMint.contractAddress}-${currentMint.tokenId}-${Date.now()}`;
                return [...prevPopups, { ...currentMint, popupId: newPopupId }];
            });
            popupsAddedThisCycle++;
            
            // --- Sound Logic (Gated by userInteracted and soundEnabled) ---
            if (!notificationProcessedForThisCycle && userInteracted && soundEnabled && typeof window.speechSynthesis !== 'undefined' && tableFilter === 'free') {
                const collectionDisplayName = (currentMint.analysis?.collectionNameFromAnalyzer && currentMint.analysis.collectionNameFromAnalyzer !== "Unknown Collection" && currentMint.analysis.collectionNameFromAnalyzer !== "Unnamed Collection")
                    ? currentMint.analysis.collectionNameFromAnalyzer
                    : (currentMint.collectionName !== "Unnamed Collection" && currentMint.collectionName !== "Unknown Collection" 
                    ? currentMint.collectionName 
                    : `the NFT collection at address ${currentMint.contractAddress.slice(0,6)}`);

                const textToSpeak = `Hey, ${collectionDisplayName} looks okay and is a free mint. Check it out!`;
                if (speechSynthesis.speaking) speechSynthesis.cancel(); 
                if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);

                utteranceRef.current = new SpeechSynthesisUtterance(textToSpeak);
                utteranceRef.current.lang = 'en-US';
                
                utteranceRef.current.onend = () => { if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current); };
                utteranceRef.current.onerror = (event) => {
                    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
                    console.error('Speech synthesis error:', event.error);
                };
                
                speechSynthesis.speak(utteranceRef.current);
                speechTimeoutRef.current = window.setTimeout(() => {
                    if (speechSynthesis.speaking && utteranceRef.current && utteranceRef.current.text === textToSpeak) {
                    speechSynthesis.cancel(); 
                    }
                }, 10000);
                notificationProcessedForThisCycle = true; 
            }
            // --- End Sound Logic ---
          
            playedNotificationForContractsRef.current.add(currentMint.contractAddress);
            try {
                localStorage.setItem(PLAYED_SOUNDS_FOR_CONTRACTS_CACHE_KEY, JSON.stringify(Array.from(playedNotificationForContractsRef.current)));
            } catch (e) {
                console.error("Error saving played notifications cache to localStorage:", e);
            }
            // Limit to one sound per cycle, but multiple popups can be added.
            // If we only want popups for the first new contract, add break here. But user wants all popups.
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableData, userInteracted, soundEnabled, tableFilter]); 

  const handlePopupClose = (popupId: string) => {
    setActivePopups(prevPopups => prevPopups.filter(p => p.popupId !== popupId));
  };

  const toggleSound = () => {
    if (!userInteracted) {
        setUserInteracted(true); 
        if (typeof window.speechSynthesis !== 'undefined') {
            try {
                const primer = new SpeechSynthesisUtterance(' '); 
                primer.volume = 0; primer.rate = 5; primer.pitch = 0;
                window.speechSynthesis.speak(primer);
                const primerTimeout = setTimeout(() => {
                  if (window.speechSynthesis.speaking && utteranceRef.current === primer) {
                    window.speechSynthesis.cancel();
                  }
                }, 200);
                if(utteranceRef.current === primer) utteranceRef.current.onend = () => clearTimeout(primerTimeout);
            } catch (e) {
                console.warn("Could not prime speech synthesis:", e);
            }
        }
    }
    const newSoundEnabledState = !soundEnabled;
    setSoundEnabled(newSoundEnabledState);
    localStorage.setItem('apechainSoundEnabledPreference_v3', String(newSoundEnabledState)); 
    
    if (!newSoundEnabledState && typeof window.speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
        speechSynthesis.cancel(); 
    }
};

  const getFilteredAndPaginatedTableData = () => {
    let filteredData = tableData;
    if (tableFilter === 'free') {
      filteredData = tableData.filter(mint => mint.isFree);
    } else if (tableFilter === 'paid') {
      filteredData = tableData.filter(mint => !mint.isFree);
    }
    return filteredData.slice(0, tableItemsPerPage);
  };
  
  const handleItemsPerPageChange = (size: number) => {
    setTableItemsPerPage(size);
    setCurrentTablePage(1); 
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-slate-100 flex flex-col items-center selection:bg-fuchsia-500 selection:text-white flex-grow">
      
      <header className="app-main-header"> {/* Moved main title here */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-fuchsia-500 to-indigo-600 pb-1 drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
            {APP_TITLE}
          </h1>
      </header>
      
      <AdvertisementBanner text={ADVERTISEMENT_TEXT} link={ADVERTISEMENT_LINK} />
      {NFT_ADVERTISEMENT_DETAILS.active && <NftAdvertisementPoster adDetails={NFT_ADVERTISEMENT_DETAILS} />}
      
      {activePopups.map(mint => (
        <NewMintPopup 
          key={mint.popupId} 
          mint={mint} 
          onClose={() => handlePopupClose(mint.popupId)} 
        />
      ))}

      <main className="w-full p-4 md:p-8 flex-grow">
        {/* Header containing APP_TITLE was here, now moved above */}

        {!providerOk && !isLoading && (
          <div className="w-full max-w-4xl mx-auto text-center p-6 bg-red-800/50 rounded-xl shadow-2xl border border-red-600 mb-6 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-red-300 mb-3">Connection Error</h2>
              <p className="text-slate-300">{error || "Could not connect to the ApeChain network. Please check your internet connection, RPC URL, or try again later."}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center text-center p-6 w-full max-w-4xl mx-auto mb-6">
            <LoadingSpinner />
            <p className="mt-4 text-lg text-slate-300">
              {providerOk ? "Connecting and listening for live mints on ApeChain..." : "Initializing ApeChain connection..."}
            </p>
          </div>
        )}
        
        {!isLoading && error && (
          <div className="w-full max-w-4xl mx-auto text-center p-6 bg-red-800/50 rounded-xl shadow-2xl border border-red-600 mb-6 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold text-red-300 mb-3">Error</h2>
              <p className="text-slate-300">{error}</p>
              {allTimeMints.length === 0 && liveFreeMints.length === 0 && livePaidMints.length === 0 && <p className="mt-2 text-slate-400">Waiting for new eligible mint events...</p>}
          </div>
        )}

        {!isLoading && rateLimitWarning && !error && (
          <div className="w-full max-w-4xl mx-auto text-center p-4 bg-yellow-700/40 rounded-xl shadow-2xl border border-yellow-500 mb-6 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-yellow-300 mb-2">Network Status</h2>
              <p className="text-slate-300 text-sm">{rateLimitWarning}</p>
          </div>
        )}
        
        {!isLoading && !error && !rateLimitWarning && liveFreeMints.length === 0 && livePaidMints.length === 0 && providerOk && allTimeMints.length === 0 && (
          <div className="w-full max-w-4xl mx-auto text-center p-6 bg-slate-800/70 rounded-xl shadow-2xl mb-6 border border-slate-700 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold text-sky-400 mb-3">Listening for Mints on ApeChain</h2>
            <p className="text-slate-300">Actively listening for new eligible mints. No mints detected yet.</p>
          </div>
        )}

        { !isLoading && (
          <div className="w-full max-w-8xl mx-auto flex flex-col md:flex-row md:space-x-6 lg:space-x-8 mt-4">
            
            <div className="w-full md:w-2/5 lg:w-1/3 flex flex-col space-y-8 mb-8 md:mb-0 transform md:hover:scale-105 transition-transform duration-300">
              <div className="bg-slate-800/50 p-4 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm">
                  <h2 className="text-3xl font-semibold text-center md:text-left text-green-400 mb-4 drop-shadow-[0_1px_1px_rgba(0,255,0,0.3)]">
                  Live Free Mints
                  </h2>
                  {liveFreeMints.length > 0 ? (
                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar" style={{maxHeight: 'calc(70vh - 120px)'}}>
                      {liveFreeMints.map((mint) => (
                      <MintCard key={`${mint.txHash}-${mint.logIndex}-free`} mint={mint} />
                      ))}
                  </div>
                  ) : (
                  providerOk && !error && (
                  <div className="p-6 bg-slate-800/30 rounded-xl shadow-lg text-center md:text-left h-40 flex items-center justify-center border border-slate-700">
                      <div>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-green-500 mb-2 animate-pulse">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                          <p className="text-slate-400 text-sm">Listening for free mints...</p>
                      </div>
                  </div>
                  )
                  )}
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl shadow-xl border border-slate-700 backdrop-blur-sm">
                  <h2 className="text-3xl font-semibold text-center md:text-left text-amber-400 mb-4 drop-shadow-[0_1px_1px_rgba(255,193,7,0.3)]">
                  Live Paid Mints
                  </h2>
                  {livePaidMints.length > 0 ? (
                  <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar" style={{maxHeight: 'calc(70vh - 120px)'}}>
                      {livePaidMints.map((mint) => (
                      <MintCard key={`${mint.txHash}-${mint.logIndex}-paid`} mint={mint} />
                      ))}
                  </div>
                  ) : (
                  providerOk && !error && (
                  <div className="p-6 bg-slate-800/30 rounded-xl shadow-lg text-center md:text-left h-40 flex items-center justify-center border border-slate-700">
                      <div>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto text-amber-500 mb-2 animate-pulse">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                          </svg>
                          <p className="text-slate-400 text-sm">Listening for paid mints...</p>
                      </div>
                  </div>
                  )
                  )}
              </div>
              {(!providerOk || (error && liveFreeMints.length === 0 && livePaidMints.length === 0)) && !isLoading && (
                <div className="p-6 bg-red-800/50 rounded-xl shadow-xl text-center md:text-left h-48 flex items-center justify-center border border-red-600 mt-4 backdrop-blur-sm">
                    <p className="text-red-300">Live feeds unavailable.</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-3/5 lg:w-2/3 transform md:hover:scale-105 transition-transform duration-300">
              {providerOk && (
                <section className="p-4 sm:p-6 bg-slate-800/70 rounded-xl shadow-2xl h-full border border-slate-700 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-teal-400 mb-3 sm:mb-0 text-center sm:text-left drop-shadow-[0_1px_1px_rgba(20,184,166,0.3)]">
                      Unique Collections <span className="text-sm text-slate-400">(Last 24h Activity)</span>
                    </h2>
                    {tableFilter === 'free' && typeof window.speechSynthesis !== 'undefined' && (
                        <button
                            onClick={toggleSound}
                            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-75 transform hover:scale-105 ${
                                soundEnabled 
                                    ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 focus:ring-pink-400 text-white' 
                                    : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 focus:ring-sky-400 text-white'
                            }`}
                            aria-live="polite"
                            aria-label={soundEnabled ? "Disable sound notifications for free mints" : "Enable sound notifications for free mints. Click to allow audio."}
                            title={soundEnabled ? "Sound alerts for free mints are ON. Click to turn OFF." : "Sound alerts for free mints are OFF. Click to turn ON."}
                        >
                            {soundEnabled ? 'Sound Alerts: ON' : 'Sound Alerts: OFF'}
                        </button>
                    )}
                  </div>
                  <div className="mb-4 flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                      <div className="flex justify-center sm:justify-start space-x-2">
                          {(['all', 'free', 'paid'] as const).map(filterType => (
                              <button
                                  key={filterType}
                                  onClick={() => setTableFilter(filterType)}
                                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-60 transform hover:scale-105
                                      ${tableFilter === filterType 
                                          ? 'bg-fuchsia-600 text-white shadow-md focus:ring-fuchsia-400' 
                                          : 'bg-slate-600 hover:bg-slate-500 text-slate-200 focus:ring-slate-400'}`}
                              >
                                  {filterType === 'all' ? 'All' : filterType === 'free' ? 'Free' : 'Paid'}
                              </button>
                          ))}
                      </div>
                      <div className="flex items-center space-x-2 text-xs sm:text-sm">
                          <span className="text-slate-300">Show:</span>
                          {[10, 20, 100].map(size => (
                              <button
                                  key={size}
                                  onClick={() => handleItemsPerPageChange(size)}
                                  className={`px-2.5 py-1 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-60 transform hover:scale-105
                                      ${tableItemsPerPage === size
                                          ? 'bg-sky-600 text-white shadow-md focus:ring-sky-400'
                                          : 'bg-slate-600 hover:bg-slate-500 text-slate-200 focus:ring-slate-400'}`}
                              >
                                  {size}
                              </button>
                          ))}
                      </div>
                  </div>

                  {isFetchingTableData && getFilteredAndPaginatedTableData().length === 0 && ( 
                      <div className="text-center text-slate-400 py-8 h-full flex flex-col items-center justify-center">
                          <LoadingSpinner />
                          <p className="mt-3">Preparing and analyzing collection data...</p>
                      </div>
                  )}
                  {(!isFetchingTableData || getFilteredAndPaginatedTableData().length > 0) && ( 
                    <MintsTable mints={getFilteredAndPaginatedTableData()} />
                  )}
                  {!isFetchingTableData && getFilteredAndPaginatedTableData().length === 0 && (
                    <div className="text-center text-slate-400 py-8 h-full flex flex-col items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-slate-600 mb-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.124 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5m-7.5 0H6.375c-.621 0-1.125.504-1.125 1.125v9.75c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125H15.75m-7.5 0v4.875c0 .621.504 1.125 1.125 1.125h4.5c.621 0 1.125-.504 1.125-1.125V7.5m-7.5 0h7.5" />
                      </svg>
                      <p>{allTimeMints.length > 0 ? `No collections found with recent activity for "${tableFilter}" filter.` : "No mint events recorded yet."}</p>
                      {allTimeMints.length === 0 && providerOk && <p className="text-sm mt-1 text-slate-500">Waiting for the first mints to appear...</p>}
                    </div>
                  )}
                </section>
              )}
              {!providerOk && !isLoading && (
                <div className="p-6 bg-slate-800/70 rounded-xl shadow-xl text-center md:text-left h-full flex items-center justify-center border border-slate-700 backdrop-blur-sm">
                    <div>
                      <h3 className="text-xl font-semibold text-yellow-300 mb-2">Table Unavailable</h3>
                      <p className="text-slate-300">The table of unique collections cannot be displayed due to a connection issue.</p>
                    </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-auto text-center text-slate-500 text-xs w-full max-w-7xl mx-auto py-6 border-t border-slate-700/50">
        <div className="flex justify-between items-center px-4 sm:px-0">
            <p>ApeChain Live Mints Viewer &copy; {new Date().getFullYear()}</p>
            <LiveVisitorsCounter />
        </div>
        {tableFilter === 'free' && typeof window.speechSynthesis !== 'undefined' && !userInteracted && (
             <p className="mt-2 text-yellow-400 text-xs px-4 sm:px-0">
                {soundEnabled 
                    ? 'Sound alerts (for free mints) are ON. Click "Sound Alerts: ON" to turn them off.'
                    : 'Sound alerts (for free mints) are OFF by default. Click "Sound Alerts: OFF" to enable.'}
            </p>
        )}
      </footer>
    </div>
  );
};

export default App;