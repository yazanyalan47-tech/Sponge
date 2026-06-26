
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, Printer, Save, X, Calculator, ShoppingCart, 
  Archive, ArrowRight, Search, Package, User, Moon, Sun, FileText, 
  Image as ImageIcon, CheckCircle, Download, Percent, Share2
} from 'lucide-react';
import { SpongeType, SpongePrices, Category, CustomerType, InvoiceItem, SavedInvoice } from './types';

// Declare html2canvas since it's loaded via script tag
declare var html2canvas: any;

// Updated Discount Options as requested
const DISCOUNT_OPTIONS = [35, 37, 40, 45, 50];

const App: React.FC = () => {
  // Theme State
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('akram_theme');
    return saved === 'dark';
  });

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Navigation & UI State
  const [view, setView] = useState<'create' | 'archive'>('create');
  const [archivedInvoices, setArchivedInvoices] = useState<SavedInvoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Invoice Header State
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('retail');
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null); // Track ID for printing
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Item Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>('sponge');
  const [thickness, setThickness] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [spongeQuantity, setSpongeQuantity] = useState<string>('1'); 
  const [spongeType, setSpongeType] = useState<SpongeType>(SpongeType.SL);
  const [discount, setDiscount] = useState<string>('50'); 
  const [otherDescription, setOtherDescription] = useState('');
  const [otherQuantity, setOtherQuantity] = useState<string>('');
  const [otherUnitPrice, setOtherUnitPrice] = useState<string>('');

  const printRef = useRef<HTMLDivElement>(null);

  // Listen for PWA install prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const formatNum = (num: number) => num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const formatDate = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const generateFullSerial = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    return `${y}${m}${d}${h}${min}${sec}`;
  };

  // Helper to get ID for printing (Saved ID or Generate new one)
  const getDisplayId = () => {
    if (currentInvoiceId) return currentInvoiceId;
    return generateFullSerial(new Date());
  };

  useEffect(() => {
    localStorage.setItem('akram_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const saved = localStorage.getItem('akram_assaf_archives');
    if (saved) setArchivedInvoices(JSON.parse(saved));
  }, []);

  useEffect(() => {
    setIsSaved(false);
    // Only reset ID if items become empty manually, otherwise keep it while editing
    if (items.length === 0 && !editingId) {
        setCurrentInvoiceId(null);
    }
  }, [items, customerName, customerType]);

  // Update discount based on customer type change (Defaults)
  useEffect(() => {
    if (customerType === 'retail') setDiscount('50');
    else if (customerType === 'wholesale') setDiscount('35');
  }, [customerType]);

  const calculateSpongePrice = useCallback((t: number, w: number, sType: SpongeType, d: number, qty: number) => {
    const basePrice = w * t * SpongePrices[sType];
    const dividedPrice = basePrice / 1000; 
    const priceAfterDiscount = dividedPrice * (d / 100);
    const finalPrice = priceAfterDiscount * qty * 10; 
    return Math.round(finalPrice * 100) / 100;
  }, []);

  const resetItemForm = () => {
    setThickness('');
    setWidth('');
    setSpongeQuantity('1');
    setSpongeType(SpongeType.SL);
    setOtherDescription('');
    setOtherQuantity('');
    setOtherUnitPrice('');
    setEditingId(null);
  };

  const handleEditItem = (item: InvoiceItem) => {
    setEditingId(item.id);
    setCategory(item.category);
    
    if (item.category === 'sponge') {
        setThickness(item.thickness?.toString() || '');
        setWidth(item.width?.toString() || '');
        setSpongeQuantity(item.quantity.toString());
        setSpongeType(item.description as SpongeType);
        // Ensure discount is string for select
        setDiscount(item.discount?.toString() || '35');
    } else {
        setOtherDescription(item.description);
        setOtherQuantity(item.quantity.toString());
        setOtherUnitPrice(item.unitPrice.toString());
    }
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddOrUpdate = () => {
    let newItem: InvoiceItem;
    if (category === 'sponge') {
      const tNum = parseFloat(thickness);
      const wNum = parseFloat(width);
      const qNum = parseFloat(spongeQuantity);
      const dNum = parseFloat(discount);

      if (isNaN(tNum) || isNaN(wNum) || isNaN(qNum) || isNaN(dNum) || tNum <= 0 || wNum <= 0 || qNum <= 0) return alert('أدخل بيانات صحيحة');
      
      const price = calculateSpongePrice(tNum, wNum, spongeType, dNum, qNum);
      newItem = {
        id: editingId || crypto.randomUUID(),
        category: 'sponge',
        description: spongeType,
        thickness: tNum,
        width: wNum,
        quantity: qNum,
        unitPrice: SpongePrices[spongeType],
        discount: dNum,
        totalPrice: price
      };
    } else {
      const qNum = parseFloat(otherQuantity);
      const uNum = parseFloat(otherUnitPrice);
      if (isNaN(qNum) || isNaN(uNum) || !otherDescription) return alert('أكمل بيانات البضاعة');
      newItem = {
        id: editingId || crypto.randomUUID(),
        category: 'other',
        description: otherDescription,
        quantity: qNum,
        unitPrice: uNum,
        totalPrice: qNum * uNum
      };
    }
    if (editingId) {
      setItems(prev => prev.map(item => item.id === editingId ? newItem : item));
    } else {
      setItems(prev => [...prev, newItem]);
    }
    resetItemForm();
    setIsSaved(false);
  };

  const handleSaveInvoice = () => {
    if (items.length === 0) return alert('الفاتورة فارغة');
    if (isSaved) return;
    const now = new Date();
    // Use existing ID if we are editing an old invoice, otherwise generate new
    const id = currentInvoiceId || generateFullSerial(now);
    
    const newInvoice: SavedInvoice = {
      id,
      customerName: customerName || 'زبون عام',
      customerType,
      date: formatDate(now),
      items,
      totalAmount: items.reduce((acc, curr) => acc + curr.totalPrice, 0)
    };
    
    // Remove old version if exists to avoid duplicates when updating
    const others = archivedInvoices.filter(inv => inv.id !== id);
    const updated = [newInvoice, ...others];
    
    setArchivedInvoices(updated);
    localStorage.setItem('akram_assaf_archives', JSON.stringify(updated));
    setCurrentInvoiceId(id);
    setIsSaved(true);
    alert('تم حفظ الفاتورة بنجاح رقم: ' + id);
  };

  const loadInvoiceFromArchive = (inv: SavedInvoice) => {
      setItems(inv.items);
      setCustomerName(inv.customerName);
      setCustomerType(inv.customerType);
      setCurrentInvoiceId(inv.id);
      setView('create');
  };

  const handleDeleteInvoice = (id: string) => {
    const password = prompt('يرجى إدخال الرقم السري لحذف الفاتورة:');
    if (password === '0001') {
      const updated = archivedInvoices.filter(a => a.id !== id);
      setArchivedInvoices(updated);
      localStorage.setItem('akram_assaf_archives', JSON.stringify(updated));
      alert('تم حذف الفاتورة بنجاح');
    } else if (password !== null) {
      alert('الرقم السري خاطئ!');
    }
  };

  const handleShareImage = async () => {
    if (!printRef.current) return;
    
    const element = printRef.current;
    
    const originalDisplay = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalWidth = element.style.width;
    
    element.style.display = 'block';
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '0';
    element.style.width = '800px'; 
    element.style.zIndex = '-1';
    
    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        
        canvas.toBlob(async (blob: Blob | null) => {
            if (!blob) return;
            const fileName = `invoice_${(customerName || 'client').replace(/\s+/g, '_')}_${Date.now()}.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'فاتورة - محلات أكرم عساف',
                        text: `فاتورة الزبون: ${customerName}`
                    });
                } catch (error) {
                    console.log('Share skipped', error);
                }
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }, 'image/png');
    } catch (err) {
        console.error('Error generating image:', err);
        alert('حدث خطأ أثناء إنشاء الصورة');
    } finally {
        element.style.display = originalDisplay;
        element.style.position = originalPosition;
        element.style.left = originalLeft;
        element.style.top = '';
        element.style.width = originalWidth;
        element.style.zIndex = '';
        setShowPrintOptions(false);
    }
  };

  const grandTotal = useMemo(() => items.reduce((acc, curr) => acc + curr.totalPrice, 0), [items]);
  const filteredArchives = archivedInvoices.filter(inv => 
    inv.id.includes(searchQuery) || inv.customerName.includes(searchQuery)
  );

  const themeClass = isDark 
    ? 'dark bg-slate-950 text-white' 
    : 'bg-white text-black'; 
    
  const cardClass = isDark 
    ? 'bg-slate-900 border-slate-700 shadow-xl' 
    : 'bg-white border-2 border-slate-200 shadow-md';
    
  const inputClass = isDark 
    ? 'bg-slate-800 border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500' 
    : 'bg-white border-2 border-slate-800 text-black placeholder-slate-500 focus:ring-blue-700 focus:border-blue-700 font-bold';

  const labelClass = isDark ? 'text-white' : 'text-black';

  if (view === 'archive') {
    return (
      <div className={`min-h-screen p-4 rtl transition-colors duration-300 ${themeClass}`}>
        <div className="max-w-4xl mx-auto">
          <header className={`flex items-center justify-between mb-8 p-4 rounded-xl shadow-sm ${cardClass}`}>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Archive className="text-blue-600 dark:text-blue-400" /> الأرشيف
            </h1>
            <div className="flex gap-2">
              <button onClick={() => setIsDark(!isDark)} className={`p-2 rounded-lg font-bold border-2 ${isDark ? 'bg-slate-700 border-slate-500 text-white' : 'bg-gray-100 border-black text-black'}`}>
                {isDark ? <Sun className="text-amber-400" /> : <Moon />}
              </button>
              <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors font-bold border-2 border-blue-900">
                <ArrowRight className="w-4 h-4" /> العودة
              </button>
            </div>
          </header>

          <div className="relative mb-6">
            <Search className={`absolute right-3 top-3.5 w-5 h-5 ${isDark ? 'text-gray-400' : 'text-black'}`} />
            <input
              type="text"
              placeholder="بحث برقم الفاتورة أو اسم الزبون..."
              className={`w-full pr-10 py-3 border rounded-xl shadow-sm outline-none font-bold ${inputClass}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredArchives.map(inv => (
              <div key={inv.id} className={`p-5 rounded-xl border ${cardClass}`}>
                <div className={`flex justify-between items-start border-b pb-3 mb-3 ${isDark ? 'border-slate-700' : 'border-slate-300'}`}>
                  <div>
                    <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-black'}`}>{inv.customerName}</h3>
                    <p className={`text-sm font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`} style={{ direction: 'ltr' }}>ID: {inv.id} | {inv.date}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-black text-blue-600 dark:text-blue-400">${formatNum(inv.totalAmount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${isDark ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-100 text-blue-900 border-blue-800'}`}>
                      {inv.customerType === 'retail' ? 'مفرق' : 'جملة'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadInvoiceFromArchive(inv)} className={`flex-1 py-2 rounded-lg font-bold border-2 ${isDark ? 'bg-blue-900/20 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-800 border-blue-200'}`}>تحميل</button>
                  <button onClick={() => { loadInvoiceFromArchive(inv); setShowPrintOptions(true); }} className={`px-4 py-2 rounded-lg border-2 ${isDark ? 'bg-slate-700 border-slate-500' : 'bg-gray-100 border-gray-400 text-black'}`}><Printer className="w-5 h-5" /></button>
                  <button onClick={() => handleDeleteInvoice(inv.id)} className={`px-4 py-2 rounded-lg border-2 ${isDark ? 'bg-red-900/20 text-red-400 border-red-800' : 'bg-red-100 text-red-800 border-red-200'}`}><Trash2 className="w-5 h-5"/></button>
                </div>
              </div>
            ))}
            {filteredArchives.length === 0 && <div className="text-center py-20 opacity-40"><Archive className="w-16 h-16 mx-auto mb-4" /><p className="text-xl">الأرشيف فارغ</p></div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 flex flex-col items-center transition-colors duration-300 ${themeClass}`}>
      {/* PWA Install Notification */}
      {showInstallBtn && (
        <div className="w-full bg-amber-500 text-black border-b-4 border-amber-700 p-3 flex justify-between items-center animate-bounce no-print z-50">
            <div className="flex items-center gap-2 font-black">
                <Download className="w-6 h-6" /> تثبيت البرنامج على هاتفك؟
            </div>
            <div className="flex gap-2">
                <button onClick={handleInstallClick} className="px-4 py-1 bg-black text-amber-500 rounded-lg font-bold border-2 border-amber-900">تثبيت</button>
                <button onClick={() => setShowInstallBtn(false)} className="p-1 font-bold"><X/></button>
            </div>
        </div>
      )}

      {showPrintOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm no-print">
          <div className={`w-full max-w-sm p-6 rounded-2xl ${cardClass}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-black'}`}>خيارات الفاتورة</h3>
              <button onClick={() => setShowPrintOptions(false)} className={`p-1 rounded-full ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}><X/></button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={() => { setShowPrintOptions(false); setTimeout(() => window.print(), 300); }} className="flex items-center justify-between p-4 bg-blue-700 text-white rounded-xl font-bold border-2 border-blue-900 hover:bg-blue-800"><span className="flex items-center gap-3"><FileText /> طباعة / PDF</span><ArrowRight/></button>
              <button onClick={handleShareImage} className="flex items-center justify-between p-4 bg-green-700 text-white rounded-xl font-bold border-2 border-green-900 hover:bg-green-800"><span className="flex items-center gap-3"><ImageIcon /> مشاركة كصورة</span><Share2/></button>
            </div>
          </div>
        </div>
      )}

      <header className="w-full bg-blue-900 text-white py-6 px-4 shadow-xl text-center no-print border-b-4 border-blue-950">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex gap-2">
              <button onClick={() => setView('archive')} className="p-3 bg-blue-800 rounded-xl hover:bg-blue-700 border-2 border-blue-400"><Archive className="w-5 h-5" /></button>
              <button onClick={() => setIsDark(!isDark)} className="p-3 bg-blue-800 rounded-xl hover:bg-blue-700 border-2 border-blue-400">{isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
            </div>
            <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-wide">محلات أكرم عساف</h1>
                <p className="text-blue-200 text-sm font-bold">بقعاتا - الشوف</p>
            </div>
            <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full border-2 border-blue-400"><ShoppingCart className="w-6 h-6" /></div>
        </div>
      </header>

      <main className="w-full max-w-4xl px-4 mt-6 space-y-6 no-print">
        {/* Customer Info Section */}
        <section className={`p-6 rounded-2xl border-r-8 border-blue-700 ${cardClass}`}>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className={`text-sm font-black flex items-center gap-1 ${labelClass}`}><User className="w-4 h-4"/> اسم الزبون</label>
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="أدخل اسم الزبون..." className={`w-full p-3 border rounded-xl outline-none focus:ring-2 ${inputClass}`}/>
              </div>
              <div className="space-y-1">
                <label className={`text-sm font-black ${labelClass}`}>نوع الزبون</label>
                <div className={`flex p-1 rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-gray-200 border-gray-400'}`}>
                  <button onClick={() => setCustomerType('retail')} className={`flex-1 py-2 rounded-lg font-black transition-all ${customerType === 'retail' ? (isDark ? 'bg-slate-600 text-white shadow ring-1 ring-slate-400' : 'bg-white shadow text-blue-900 ring-1 ring-black') : 'opacity-70 text-gray-500'}`}>مفرق</button>
                  <button onClick={() => setCustomerType('wholesale')} className={`flex-1 py-2 rounded-lg font-black transition-all ${customerType === 'wholesale' ? (isDark ? 'bg-slate-600 text-white shadow ring-1 ring-slate-400' : 'bg-white shadow text-blue-900 ring-1 ring-black') : 'opacity-70 text-gray-500'}`}>جملة</button>
                </div>
              </div>
           </div>
        </section>

        {/* Item Entry Section */}
        <section className={`p-6 rounded-2xl space-y-4 ${cardClass}`}>
          {/* Category Tabs */}
          <div className={`flex p-1 rounded-xl border-2 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-blue-50 border-blue-200'}`}>
            <button onClick={() => setCategory('sponge')} className={`flex-1 py-3 rounded-lg font-black flex items-center justify-center gap-2 transition-all ${category === 'sponge' ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-600'}`}><Calculator className="w-5 h-5"/> إسفنج</button>
            <button onClick={() => setCategory('other')} className={`flex-1 py-3 rounded-lg font-black flex items-center justify-center gap-2 transition-all ${category === 'other' ? 'bg-blue-700 text-white shadow-lg' : 'text-blue-600'}`}><Package className="w-5 h-5"/> بضاعة أخرى</button>
          </div>

          {/* Modified Grid for Stacking Fields Vertically */}
          <div className="grid grid-cols-1 gap-4"> 
            {category === 'sponge' ? (
              <>
                <div className="space-y-1">
                    <label className={`text-xs font-black ${labelClass}`}>السماكة (سم)</label>
                    <input type="number" value={thickness} onChange={e => setThickness(e.target.value)} placeholder="0" className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/>
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-black ${labelClass}`}>العرض (سم)</label>
                    <input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder="0" className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/>
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-black ${labelClass}`}>العدد</label>
                    <input type="number" value={spongeQuantity} onChange={e => setSpongeQuantity(e.target.value)} placeholder="1" className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/>
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-black ${labelClass}`}>النوع</label>
                    <select value={spongeType} onChange={e => setSpongeType(e.target.value as SpongeType)} className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}>
                        {Object.values(SpongeType).map(t => <option key={t} value={t} className="bg-white text-black font-bold">{t}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className={`text-xs font-black ${labelClass}`}>الحسم %</label>
                    <div className="relative">
                        <select value={discount} onChange={e => setDiscount(e.target.value)} className={`w-full p-3 border rounded-xl outline-none text-center appearance-none ${inputClass}`}>
                            {DISCOUNT_OPTIONS.map(opt => (
                                <option key={opt} value={opt} className="text-black font-bold">{opt}</option>
                            ))}
                        </select>
                        <Percent className={`absolute left-2 top-3.5 w-4 h-4 pointer-events-none ${isDark ? 'text-gray-400' : 'text-black'}`}/>
                    </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1"><label className={`text-xs font-black ${labelClass}`}>وصف البضاعة</label><input type="text" value={otherDescription} onChange={e => setOtherDescription(e.target.value)} placeholder="قماش، خشب..." className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/></div>
                <div className="space-y-1"><label className={`text-xs font-black ${labelClass}`}>الكمية</label><input type="number" value={otherQuantity} onChange={e => setOtherQuantity(e.target.value)} placeholder="0" className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/></div>
                <div className="space-y-1"><label className={`text-xs font-black ${labelClass}`}>السعر ($)</label><input type="number" value={otherUnitPrice} onChange={e => setOtherUnitPrice(e.target.value)} placeholder="0" className={`w-full p-3 border rounded-xl outline-none ${inputClass}`}/></div>
              </>
            )}
          </div>

          <button onClick={handleAddOrUpdate} className="w-full py-4 bg-blue-700 text-white rounded-xl font-black shadow-lg flex items-center justify-center gap-2 border-2 border-blue-900 active:scale-95 transition-transform">
            {editingId ? <><Save/> حفظ التعديل</> : <><Plus/> إضافة للفاتورة</>}
          </button>
        </section>

        {/* Invoice Items Table */}
        <section className={`rounded-2xl overflow-hidden border-2 ${isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'} shadow-md`}>
          <div className={`p-4 flex justify-between items-center border-b-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-slate-300'}`}>
             <h3 className={`font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-black'}`}><ShoppingCart className="w-5 h-5"/> الأصناف</h3>
             <div className="flex gap-2">
                 <button onClick={handleSaveInvoice} disabled={isSaved} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 border-2 ${isSaved ? 'bg-gray-400 border-gray-500 text-gray-800' : 'bg-emerald-600 border-emerald-800 text-white'}`}>{isSaved ? <CheckCircle className="w-4 h-4"/> : <Save className="w-4 h-4"/>} حفظ</button>
                 <button onClick={() => setShowPrintOptions(true)} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 border-2 ${isDark ? 'bg-slate-700 border-slate-500 text-white' : 'bg-gray-800 border-black text-white'}`}><Printer className="w-4 h-4"/> طباعة</button>
             </div>
          </div>
          
          <div className="overflow-x-auto bg-white dark:bg-slate-900">
            <table className="w-full text-right">
              <thead className={isDark ? 'bg-slate-800 text-white' : 'bg-blue-100 text-black'}>
                  <tr>
                      <th className="p-3 font-black text-sm">الصنف</th>
                      <th className="p-3 font-black text-sm">التفاصيل</th>
                      <th className="p-3 font-black text-sm">السعر</th>
                      <th className="p-3 font-black text-sm">تحكم</th>
                  </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-700 text-slate-200' : 'divide-gray-300 text-black'}`}>
                {items.map(item => (
                  <tr key={item.id} className={isDark ? 'bg-slate-900 hover:bg-slate-800' : 'bg-white hover:bg-blue-50'}>
                    <td className="p-3 font-bold">{item.description}</td>
                    <td className="p-3 text-sm font-bold opacity-100">
                        {item.category === 'sponge' 
                            ? <span className="flex flex-col"><span className="text-xs opacity-70">قياس:</span> {item.width}×{item.thickness} <span className="text-xs opacity-70">العدد:</span> {item.quantity}</span> 
                            : item.quantity}
                    </td>
                    <td className="p-3 font-black text-blue-600 dark:text-blue-400">${formatNum(item.totalPrice)}</td>
                    <td className="p-3 flex justify-center gap-2">
                        {/* Activated Edit Button */}
                        <button onClick={() => handleEditItem(item)} className="text-amber-600 font-bold"><Edit2 className="w-5 h-5"/></button>
                        <button onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-600 font-bold"><Trash2 className="w-5 h-5"/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 0 && <tfoot className={isDark ? 'bg-slate-800 text-white' : 'bg-blue-100 text-black'}><tr><td colSpan={2} className="p-4 font-black">المجموع النهائي</td><td colSpan={2} className="p-4 font-black text-2xl text-blue-700 dark:text-blue-400">${formatNum(grandTotal)}</td></tr></tfoot>}
            </table>
          </div>
        </section>
      </main>

      {/* Floating Action Bar for Mobile */}
      <div className={`fixed bottom-0 w-full p-4 flex justify-between items-center lg:hidden no-print border-t-2 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-blue-200'}`}>
        <div><p className={`text-xs font-black ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>المجموع</p><p className="text-2xl font-black text-blue-600 dark:text-blue-400">${formatNum(grandTotal)}</p></div>
        <div className="flex gap-2">
            <button onClick={handleSaveInvoice} disabled={isSaved || items.length === 0} className={`p-3 rounded-xl shadow-lg border-2 ${isSaved ? 'bg-gray-400 border-gray-600' : 'bg-emerald-600 border-emerald-800 text-white'}`}>{isSaved ? <CheckCircle/> : <Save/>}</button>
            <button onClick={() => setShowPrintOptions(true)} className="bg-blue-700 text-white p-3 rounded-xl shadow-lg border-2 border-blue-900" disabled={items.length === 0}><Printer/></button>
        </div>
      </div>

      {/* Print Layout - Black & White Enforcement */}
      <div ref={printRef} className="print-only w-full bg-white text-black p-10" style={{ direction: 'rtl' }}>
          <div className="flex justify-between items-center border-b-4 border-double border-black pb-4 mb-6">
              <div>
                  <h1 className="text-4xl font-black text-black">فاتورة بيع</h1>
                  <p className="font-bold text-lg mt-2 text-black">التاريخ: {formatDate(new Date())}</p>
                  <p className="font-bold text-sm mt-1 text-black">رقم الفاتورة: {getDisplayId()}</p>
              </div>
          </div>
          <div className="mb-6 border-2 border-black p-4 rounded-xl text-black"><strong>السيد/ة:</strong> <span className="text-2xl font-bold mr-2 text-black">{customerName || '................................'}</span></div>
          <table className="w-full border-collapse border-2 border-black mb-10 text-black">
              <thead>
                  <tr>
                      <th className="border-2 border-black p-2 text-lg text-black font-black">#</th>
                      <th className="border-2 border-black p-2 text-lg text-black font-black">البيان</th>
                      <th className="border-2 border-black p-2 text-lg text-black font-black">العدد</th>
                      <th className="border-2 border-black p-2 text-lg text-black font-black">الإفرادي</th>
                      <th className="border-2 border-black p-2 text-lg text-black font-black">المجموع</th>
                  </tr>
              </thead>
              <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id}>
                        <td className="border-2 border-black p-2 text-center font-bold text-black">{i+1}</td>
                        <td className="border-2 border-black p-2 font-bold text-lg text-black">
                             {item.category === 'sponge' ? (
                               <span dir="ltr" className="inline-block">{item.thickness}×{item.width} {item.description}</span>
                            ) : (
                               item.description
                            )}
                        </td>
                        <td className="border-2 border-black p-2 text-center font-bold text-lg text-black">{item.quantity}</td>
                        <td className="border-2 border-black p-2 text-center font-bold text-lg text-black">${formatNum(item.totalPrice / item.quantity)}</td>
                        <td className="border-2 border-black p-2 text-center font-bold text-lg text-black">${formatNum(item.totalPrice)}</td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                  <tr>
                      <td colSpan={4} className="border-2 border-black p-2 text-left text-xl text-black font-black">الإجمالي النهائي:</td>
                      <td className="border-2 border-black p-2 text-center text-2xl font-black text-black">${formatNum(grandTotal)}</td>
                  </tr>
              </tfoot>
          </table>
          <div className="mt-10 grid grid-cols-2 text-center font-black text-xl text-black"><div>توقيع الزبون</div><div>توقيع المحل</div></div>
          <div className="text-center mt-6 font-bold text-lg border-t-2 border-black pt-4">شكراً لزيارتكم</div>
      </div>
    </div>
  );
};

export default App;
