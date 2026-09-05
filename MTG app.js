import React, { useState } from 'react';

const CARD_LIST = [
  '"Name Sticker" Goblin',
  "Alchemist's Retrieval",
  "An Offer You Can't Refuse",
  "Ancestral Statue",
  "Autumn's Veil",
  "Azure Beastbinder",
  "Beast Whisperer",
  "Bond Beetle",
  "Bring to Light",
  "Cankerbloom",
  "Cascade Bluffs",
  "Cloud of Faeries",
  "Command Tower",
  "Copperline Gorge",
  "Den Protector",
  "Destiny Spinner",
  "Dispel",
  "Eldritch Evolution",
  "Elvish Mystic",
  "Elvish Spirit Guide",
  "Eternal Witness",
  "Evolution Witness",
  "Exotic Orchard",
  "Fauna Shaman",
  "Fiery Islet",
  "Flare of Cultivation",
  "Flare of Duplication",
  "Flooded Grove",
  "Fyndhorn Elves",
  "Gemstone Mine",
  "Goblin Cratermaker",
  "Goldhound",
  "Grazilaxx, Illithid Scholar",
  "Imperial Recruiter",
  "Karplusan Forest",
  "Lightning Bolt",
  "Llanowar Elves",
  "Malevolent Hermit",
  "Manglehorn",
  "Mezzio Mugger",
  "Miscast",
  "Myr Scrapling",
  "Nature's Rhythm",
  "Neoform",
  "Ohran Frostfang",
  "Outland Liberator",
  "Peregrine Drake",
  "Phyrexian Metamorph",
  "Phyrexian Revoker",
  "Professional Face-Breaker",
  "Radagast the Brown",
  "Reclamation Sage",
  "Scour for Scrap",
  "Shared Summons",
  "Shivan Reef",
  "Simian Spirit Guide",
  "Siren Stormtamer",
  "Skirk Prospector",
  "Slithermuse",
  "Sol Ring",
  "Spell Pierce",
  "Spellseeker",
  "Starwinder",
  "Strike It Rich",
  "Tarnished Citadel",
  "Temur Sabertooth",
  "Thran Quarry",
  "Tinder Wall",
  "Toski, Bearer of Secrets",
  "Transit Mage",
  "Utopia Sprawl",
  "Vizier of the Menagerie",
  "Volatile Stormdrake",
  "Walking Ballista",
  "Waterlogged Grove",
  "Weird Harvest",
  "Wild Cantor",
  "Witty Roastmaster",
  "Yavimaya Coast",
  "Yusri, Fortune's Flame",
  "Animar, Soul of Elements"
];

const delay = ms => new Promise(r => setTimeout(r, ms));

export default function MTGCardTracker() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: CARD_LIST.length, cardName: '' });
  const [view, setView] = useState('priskoll');
  const [errorCards, setErrorCards] = useState([]);

  const fetchCardData = async () => {
    setLoading(true);
    setErrorCards([]);
    const results = [];
    const errors = [];
    
    for (let i = 0; i < CARD_LIST.length; i++) {
      const cardName = CARD_LIST[i].trim();
      setProgress({ current: i + 1, total: CARD_LIST.length, cardName });
      
      try {
        const url = `https://api.scryfall.com/cards/search?q=!"${encodeURIComponent(cardName)}"&unique=prints`;
        const resp = await fetch(url);
        
        if (resp.ok) {
          const data = await resp.json();
          const printings = data.data
            .filter(c => c.prices && c.prices.eur)
            .map(c => ({
              name: cardName,
              set: (c.set || '').toUpperCase(),
              setName: c.set_name || '',
              collectorNumber: c.collector_number || '',
              rarity: c.rarity || '',
              priceEur: parseFloat(c.prices.eur),
              cardmarketUrl: c.purchase_uris ? c.purchase_uris.cardmarket : '',
              imageUrl: c.image_uris ? c.image_uris.small : (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris ? c.card_faces[0].image_uris.small : '')
            }));
          
          if (printings.length > 0) {
            results.push(...printings);
          } else {
            errors.push(cardName + ' (inga EUR-priser)');
          }
        } else if (resp.status === 404) {
          errors.push(cardName + ' (ej funnet)');
        } else {
          errors.push(cardName + ' (API-fel)');
        }
      } catch (e) {
        errors.push(cardName + ' (nätverksfel)');
      }
      
      await delay(100);
    }
    
    setCards(results);
    setErrorCards(errors);
    setLoading(false);
  };

  const getCheapestByCard = () => {
    const cheapest = {};
    cards.forEach(c => {
      if (!cheapest[c.name] || c.priceEur < cheapest[c.name].priceEur) {
        cheapest[c.name] = c;
      }
    });
    return cheapest;
  };

  const getBySet = () => {
    const bySet = {};
    cards.forEach(c => {
      if (!bySet[c.set]) bySet[c.set] = [];
      bySet[c.set].push(c);
    });
    const sorted = Object.entries(bySet).sort((a, b) => b[1].length - a[1].length);
    const result = {};
    sorted.forEach(([k, v]) => { result[k] = v; });
    return result;
  };

  const getCheapestBySet = () => {
    const cheapest = getCheapestByCard();
    const bySet = {};
    Object.values(cheapest).forEach(c => {
      if (!bySet[c.set]) bySet[c.set] = [];
      bySet[c.set].push(c.name);
    });
    return bySet;
  };

  const exportToCSV = () => {
    const cheapest = getCheapestByCard();
    const cheapestBySet = getCheapestBySet();
    
    let csv = 'Set,Kortnamn,Pris EUR,Cardmarket\n';
    Object.entries(cheapestBySet).sort((a,b) => a[0].localeCompare(b[0])).forEach(([set, names]) => {
      names.sort().forEach(name => {
        const c = cheapest[name];
        csv += `${c.set},"${c.name}",${c.priceEur.toFixed(2)},${c.cardmarketUrl}\n`;
      });
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MTG_Kortjakt.csv';
    a.click();
  };

  const cheapest = getCheapestByCard();
  const totalCheapest = Object.values(cheapest).reduce((sum, c) => sum + (c.priceEur || 0), 0);
  const bySet = getBySet();
  const cheapestBySet = getCheapestBySet();

  const getPriceColor = (price) => {
    if (price < 1) return 'bg-green-100 text-green-800';
    if (price <= 5) return 'bg-yellow-100 text-yellow-800';
    if (price <= 20) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🎴 MTG Kortjakt</h1>
        <p className="text-gray-600 mb-6">Hitta dina kort billigast - sorterat per set för pärmjakten</p>
        
        {!loading && cards.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 mb-6 text-lg">Klicka för att hämta prisdata från Scryfall</p>
            <p className="text-gray-400 mb-6">{CARD_LIST.length} kort att söka igenom</p>
            <button
              onClick={fetchCardData}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg"
            >
              🚀 Hämta kortdata
            </button>
          </div>
        )}
        
        {loading && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-700 font-semibold text-lg">Hämtar från Scryfall...</span>
              <span className="text-blue-600 font-bold">{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
              <div 
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current/progress.total)*100}%` }}
              />
            </div>
            <p className="text-gray-500 text-center">{progress.cardName}</p>
          </div>
        )}
        
        {cards.length > 0 && !loading && (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-8">
                  <div className="text-center">
                    <span className="text-gray-500 text-sm block">Unika kort</span>
                    <p className="text-3xl font-bold text-gray-800">{Object.keys(cheapest).length}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500 text-sm block">Totalt (billigaste)</span>
                    <p className="text-3xl font-bold text-green-600">{totalCheapest.toFixed(2)} €</p>
                  </div>
                  <div className="text-center">
                    <span className="text-gray-500 text-sm block">Set att kolla</span>
                    <p className="text-3xl font-bold text-blue-600">{Object.keys(cheapestBySet).length}</p>
                  </div>
                </div>
                <button
                  onClick={exportToCSV}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow"
                >
                  📥 Ladda ner CSV
                </button>
              </div>
              
              {errorCards.length > 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                  <strong>Varning:</strong> {errorCards.length} kort kunde inte hämtas: {errorCards.slice(0,5).join(', ')}{errorCards.length > 5 && '...'}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mb-6">
              {['perSet', 'shopping', 'priskoll'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-6 py-3 rounded-xl font-semibold transition ${view === v ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-50 shadow'}`}
                >
                  {v === 'perSet' ? '📁 Per Set' : v === 'shopping' ? '📝 Shoppinglista' : '💰 Priskoll'}
                </button>
              ))}
            </div>
            
            {view === 'perSet' && (
              <div className="space-y-6">
                {Object.entries(bySet).map(([set, printings]) => (
                  <div key={set} className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex justify-between items-center">
                      <div>
                        <span className="font-bold text-xl">{set}</span>
                        <span className="ml-3 opacity-80">{printings[0] && printings[0].setName}</span>
                      </div>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-sm">{printings.length} printings</span>
                    </div>
                    <div className="divide-y">
                      {printings.sort((a,b) => a.name.localeCompare(b.name)).map((p, i) => {
                        const isCheapest = cheapest[p.name] && cheapest[p.name].set === p.set && cheapest[p.name].priceEur === p.priceEur;
                        return (
                          <div key={i} className={`flex items-center px-6 py-3 gap-4 ${isCheapest ? 'bg-green-50' : ''}`}>
                            {p.imageUrl && <img src={p.imageUrl} alt="" className="w-12 h-16 object-contain rounded shadow" />}
                            <div className="flex-1 min-w-0">
                              <span className={`block truncate ${isCheapest ? 'font-bold text-green-700' : 'text-gray-800'}`}>
                                {isCheapest && '⭐ '}{p.name}
                              </span>
                              <span className="text-gray-400 text-sm">#{p.collectorNumber} · {p.rarity}</span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getPriceColor(p.priceEur)}`}>
                              {p.priceEur.toFixed(2)} €
                            </span>
                            {p.cardmarketUrl && (
                              <a href={p.cardmarketUrl} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:text-blue-800 font-semibold">CM →</a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {view === 'shopping' && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 text-white">
                  <span className="font-bold text-xl">📝 Shoppinglista för pärmjakten</span>
                </div>
                <div className="divide-y">
                  {Object.entries(cheapestBySet).sort((a,b) => a[0].localeCompare(b[0])).map(([set, names]) => (
                    <div key={set} className="px-6 py-4 flex gap-4">
                      <span className="font-mono font-bold text-blue-600 w-16 flex-shrink-0">{set}</span>
                      <span className="text-gray-700">{names.sort().join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {view === 'priskoll' && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 text-white">
                  <span className="font-bold text-xl">💰 Priskoll (dyrast först)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left font-semibold text-gray-600">Kortnamn</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Billigaste</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Pris</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Alt 1</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Alt 2</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {Object.values(cheapest)
                        .sort((a, b) => b.priceEur - a.priceEur)
                        .map((c, i) => {
                          const allPrints = cards.filter(p => p.name === c.name).sort((a,b) => a.priceEur - b.priceEur);
                          return (
                            <tr key={i} className={c.priceEur > 5 ? 'bg-yellow-50' : ''}>
                              <td className="px-6 py-3 font-medium text-gray-800">{c.name}</td>
                              <td className="px-4 py-3 font-mono text-sm text-blue-600">{c.set}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={`px-2 py-1 rounded font-bold text-sm ${getPriceColor(c.priceEur)}`}>
                                  {c.priceEur.toFixed(2)} €
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {allPrints[1] && `${allPrints[1].set} (${allPrints[1].priceEur.toFixed(2)}€)`}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {allPrints[2] && `${allPrints[2].set} (${allPrints[2].priceEur.toFixed(2)}€)`}
                              </td>
                              <td className="px-4 py-3">
                                {c.cardmarketUrl && (
                                  <a href={c.cardmarketUrl} target="_blank" rel="noopener noreferrer"
                                     className="text-blue-600 hover:text-blue-800 font-semibold">CM →</a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}