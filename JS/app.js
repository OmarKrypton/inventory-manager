const { useState, useEffect, useRef, useCallback, useMemo } = React;

// ========== CONSTANTS & SAMPLE DATA ==========
const INITIAL_INVENTORY = [
    { id: 1, name: "MacBook Pro 14\"", category: "Electronics", quantity: 15, minStock: 5, price: 1999, supplier: "Apple", location: "Office HQ", images: [] },
    { id: 2, name: "Ergonomic Office Chair", category: "Furniture", quantity: 25, minStock: 10, price: 349, supplier: "Herman Miller", location: "Warehouse A", images: [] },
    { id: 3, name: "4K Monitor 27\"", category: "Electronics", quantity: 40, minStock: 15, price: 450, supplier: "Dell", location: "Office HQ", images: [] },
    { id: 4, name: "Wireless Mechanical Keyboard", category: "Accessories", quantity: 100, minStock: 30, price: 129, supplier: "Logitech", location: "Storage Room", images: [] },
    { id: 5, name: "Electric Standing Desk", category: "Furniture", quantity: 12, minStock: 5, price: 599, supplier: "Fully", location: "Warehouse B", images: [] },
    { id: 6, name: "Noise Cancelling Headphones", category: "Accessories", quantity: 30, minStock: 10, price: 349, supplier: "Sony", location: "Office HQ", images: [] },
    { id: 7, name: "Smart LED Desk Lamp", category: "Lighting", quantity: 65, minStock: 20, price: 79, supplier: "Xiaomi", location: "Storage Room", images: [] },
    { id: 8, name: "USB-C Docking Station", category: "Accessories", quantity: 150, minStock: 50, price: 89, supplier: "Anker", location: "Storage Room", images: [] }
];

// ========== UTILITY FUNCTIONS ==========
const Utils = {
    getTimeAgo: (timestamp) => {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return then.toLocaleDateString();
    },

    parseCSV: (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) throw new Error('CSV file is empty or invalid');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) continue;
            const item = {};
            headers.forEach((header, index) => {
                const value = values[index];
                if (header === 'name' || header === 'item name' || header === 'item_name') item.name = value;
                else if (header === 'category') item.category = value;
                else if (header === 'quantity' || header === 'qty' || header === 'stock') item.quantity = parseInt(value) || 0;
                else if (header === 'minstock' || header === 'min_stock' || header === 'minimum') item.minStock = parseInt(value) || 0;
                else if (header === 'price') item.price = parseFloat(value) || 0;
                else if (header === 'supplier') item.supplier = value;
                else if (header === 'location' || header === 'warehouse') item.location = value;
            });
            if (item.name && item.category) {
                item.quantity = item.quantity || 0;
                item.minStock = item.minStock || 0;
                item.price = item.price || 0;
                item.supplier = item.supplier || 'Unknown';
                item.location = item.location || 'Warehouse A';
                items.push(item);
            }
        }
        return items;
    },

    generatePDFReport: (inventory, addAlert) => {
        addAlert('Generating professional multi-page PDF report...', 'info');

        setTimeout(async () => {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF('landscape', 'mm', 'a4');
                const primaryColor = [13, 148, 136];
                const copperColor = [180, 83, 9];
                const darkColor = [31, 41, 55];

                let logoDataUrl = null;
                try {
                    const response = await fetch('../Images/logo.png');
                    const blob = await response.blob();
                    logoDataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.log('Logo not found, continuing without it');
                }

                doc.setFillColor(...primaryColor);
                doc.rect(0, 0, 297, 30, 'F');

                if (logoDataUrl) {
                    doc.addImage(logoDataUrl, 'PNG', 12, 4, 22, 22);
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(22);
                    doc.text('INVENTORY MANAGER', 40, 18);
                } else {
                    doc.setTextColor(255, 255, 255);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(22);
                    doc.text('INVENTORY MANAGER', 15, 18);
                }

                const today = new Date().toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                doc.setFontSize(10);
                doc.text(`Report Generated: ${today}`, 15, 38);

                let yPos = 50;
                const cardWidth = 55;
                const cardHeight = 20;
                const cardGap = 8;

                const totalItems = inventory.length;
                const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                const lowStockCount = inventory.filter(item => item.quantity <= item.minStock).length;
                const categoriesCount = [...new Set(inventory.map(item => item.category))].length;

                const summaryCards = [
                    { label: 'Total Items', value: totalItems.toString(), color: primaryColor },
                    { label: 'Total Value', value: '$' + totalValue.toLocaleString(), color: copperColor },
                    { label: 'Low Stock Alerts', value: lowStockCount.toString(), color: lowStockCount > 0 ? [239, 68, 68] : primaryColor },
                    { label: 'Categories', value: categoriesCount.toString(), color: primaryColor }
                ];

                let xPos = 15;
                summaryCards.forEach(card => {
                    doc.setFillColor(249, 250, 251);
                    doc.setDrawColor(...card.color);
                    doc.setLineWidth(0.5);
                    doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 3, 3, 'FD');

                    doc.setTextColor(107, 114, 128);
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.text(card.label, xPos + 5, yPos + 8);

                    doc.setTextColor(...darkColor);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(12);
                    doc.text(card.value, xPos + 5, yPos + 16);
                    xPos += cardWidth + cardGap;
                });

                yPos = 75;
                doc.setTextColor(...darkColor);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('Inventory by Category', 15, yPos);

                const categoryData = {};
                inventory.forEach(item => {
                    if (!categoryData[item.category]) categoryData[item.category] = { count: 0, value: 0 };
                    categoryData[item.category].count += 1;
                    categoryData[item.category].value += item.quantity * item.price;
                });

                const categoryRows = Object.entries(categoryData).map(([cat, data]) => [
                    cat, data.count.toString(), '$' + data.value.toLocaleString()
                ]);

                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Category', 'Items Count', 'Total Value']],
                    body: categoryRows,
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, textColor: 255 },
                    styles: { fontSize: 9, cellPadding: 3 },
                    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: 'center' }, 2: { cellWidth: 60, halign: 'right' } },
                    margin: { left: 15, right: 15 }
                });

                doc.addPage();
                yPos = 20;
                doc.setTextColor(...darkColor);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text('Detailed Inventory List', 15, yPos);

                const inventoryRows = inventory.map(item => [
                    item.name, item.category, item.supplier, item.location,
                    item.quantity.toString(), item.minStock.toString(),
                    '$' + item.price.toLocaleString(), '$' + (item.quantity * item.price).toLocaleString(),
                    item.quantity <= item.minStock ? '⚠️ LOW' : '✓ OK'
                ]);

                doc.autoTable({
                    startY: yPos + 5,
                    head: [['Item Name', 'Category', 'Supplier', 'Location', 'Qty', 'Min', 'Price', 'Total Value', 'Status']],
                    body: inventoryRows,
                    theme: 'striped',
                    headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2 },
                    columnStyles: {
                        0: { cellWidth: 50 }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 },
                        4: { cellWidth: 15, halign: 'center' }, 5: { cellWidth: 15, halign: 'center' },
                        6: { cellWidth: 25, halign: 'right' }, 7: { cellWidth: 30, halign: 'right' },
                        8: { cellWidth: 22, halign: 'center' }
                    },
                    margin: { left: 15, right: 15 },
                    didDrawPage: (data) => {
                        doc.setFontSize(8);
                        doc.setTextColor(156, 163, 175);
                        doc.text(`Inventory Manager - Page ${data.pageNumber}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                    }
                });

                const fileName = `Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(fileName);
                addAlert(`PDF report saved as ${fileName}`, 'success');
            } catch (error) {
                console.error('PDF generation error:', error);
                addAlert('Error generating PDF. Falling back to print...', 'warning');
                window.print();
            }
        }, 100);
    },
    compressImage: (file, maxWidth = 600, maxHeight = 600, quality = 0.5) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }
};

// ========== DATA HOOKS ==========

function useInventoryData(addAlert) {
    const [inventory, setInventory] = useState(() => {
        const saved = localStorage.getItem('im_inventory');
        if (saved) { try { return JSON.parse(saved); } catch (e) { return INITIAL_INVENTORY; } }
        return INITIAL_INVENTORY;
    });
    const [stockMovements, setStockMovements] = useState(() => {
        const saved = localStorage.getItem('im_stock_movements');
        if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
        return [];
    });
    const [purchaseOrders, setPurchaseOrders] = useState(() => {
        const saved = localStorage.getItem('im_purchase_orders');
        if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
        return [];
    });
    const [activities, setActivities] = useState(() => {
        const saved = localStorage.getItem('im_activities');
        if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
        return [];
    });
    const [customCategories, setCustomCategories] = useState(() => {
        const saved = localStorage.getItem('im_custom_categories');
        if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
        return [];
    });

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showOnlineBanner, setShowOnlineBanner] = useState(false);

    const logActivity = useCallback((type, message, details = null, entityId = null, entityName = null) => {
        const newActivity = {
            id: Date.now(), type, message, details, entityId, entityName,
            user: 'Admin', timestamp: new Date().toISOString()
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 500));
    }, []);

    const addStockMovement = useCallback((itemId, itemName, type, quantity, reason, previousQty, newQty, user = 'System') => {
        const movement = { id: Date.now(), itemId, itemName, type, quantity, reason, previousQty, newQty, user, timestamp: new Date().toISOString() };
        setStockMovements(prev => [movement, ...prev]);
    }, []);

    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); setShowOnlineBanner(true); setTimeout(() => setShowOnlineBanner(false), 3000); };
        const handleOffline = () => { setIsOnline(false); setShowOnlineBanner(true); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
    }, []);

    useEffect(() => { localStorage.setItem('im_inventory', JSON.stringify(inventory)); }, [inventory]);
    useEffect(() => { localStorage.setItem('im_activities', JSON.stringify(activities)); }, [activities]);
    useEffect(() => { localStorage.setItem('im_custom_categories', JSON.stringify(customCategories)); }, [customCategories]);
    useEffect(() => { localStorage.setItem('im_stock_movements', JSON.stringify(stockMovements)); }, [stockMovements]);
    useEffect(() => { localStorage.setItem('im_purchase_orders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);

    return {
        inventory, setInventory, stockMovements, setStockMovements,
        purchaseOrders, setPurchaseOrders, activities, setActivities,
        customCategories, setCustomCategories,
        isSyncingToCloud: false, lastCloudSync: null, firebaseUser: null, isFirebaseLoading: false,
        isOnline, showOnlineBanner, setShowOnlineBanner, pendingChanges: 0,
        logActivity, addStockMovement,
        saveToCloud: () => { }, loadFromCloud: () => { }, queueChange: () => { }, syncChanges: () => { }
    };
}

// ========== ALERT NOTIFICATION SYSTEM ==========
const AlertContext = React.createContext();

function AlertProvider({ children }) {
    const [alerts, setAlerts] = useState([]);

    const removeAlert = useCallback((id) => {
        setAlerts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addAlert = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        const newAlert = { id, message, type, duration };
        setAlerts(prev => [...prev, newAlert]);

        if (duration > 0) {
            setTimeout(() => removeAlert(id), duration);
        }
    }, [removeAlert]);

    const contextValue = useMemo(() => ({ addAlert, removeAlert }), [addAlert, removeAlert]);

    return (
        <AlertContext.Provider value={contextValue}>
            {children}
            <div className="alert-container">
                {alerts.map(alert => (
                    <Alert key={alert.id} {...alert} onClose={() => removeAlert(alert.id)} />
                ))}
            </div>
        </AlertContext.Provider>
    );
}

function Alert({ message, type, onClose }) {
    const [isRemoving, setIsRemoving] = useState(false);

    const handleClose = () => {
        setIsRemoving(true);
        setTimeout(onClose, 300);
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    return (
        <div className={`alert ${type} ${isRemoving ? 'removing' : ''}`} onClick={handleClose}>
            <span className="alert-icon">{icons[type]}</span>
            <span className="alert-message">{message}</span>
            <button className="alert-close" onClick={(e) => { e.stopPropagation(); handleClose(); }}>×</button>
        </div>
    );
}

function useAlert() {
    return React.useContext(AlertContext);
}

// ========== DARK MODE HOOK ==========
function useDarkMode() {
    const [isDark, setIsDark] = useState(() => {
        const saved = localStorage.getItem('im_dark_mode');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('im_dark_mode', JSON.stringify(isDark));
    }, [isDark]);

    const toggle = () => setIsDark(!isDark);

    return { isDark, toggle };
}

// ========== THEME TOGGLE BUTTON ==========

function OfflineBanner({ isOnline, show, onClose }) {
    if (!show) return null;

    return (
        <div className={`offline-banner ${!isOnline ? '' : 'hidden'}`}>
            <span className="offline-banner-icon">📡</span>
            <span>{isOnline ? 'Back online! Changes will be saved.' : 'You are offline. Changes will be saved locally.'}</span>
            <button className="offline-banner-close" onClick={onClose}>×</button>
        </div>
    );
}

// ========== THEME TOGGLE BUTTON ==========
function ThemeToggle({ isDark, toggle }) {
    return (
        <button className="theme-toggle" onClick={toggle} title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDark ? '☀️' : '🌙'}
        </button>
    );
}

// Initial inventory moved to constants at top

// ========== ANALYTICS SUB-COMPONENTS ==========

function TopValueItems({ inventory }) {
    const topItems = useMemo(() =>
        [...inventory].sort((a, b) => (b.quantity * b.price) - (a.quantity * a.price)).slice(0, 5)
        , [inventory]);

    return (
        <div className="card">
            <h3 className="card-title">💎 Top Value Items</h3>
            <div className="top-items-list">
                {topItems.map((item, index) => (
                    <div key={item.id} className="top-item">
                        <div className="top-item-rank">{index + 1}</div>
                        <div style={{ flex: 1 }}>
                            <div className="top-item-name">{item.name}</div>
                            <div className="top-item-category">{item.category}</div>
                        </div>
                        <div className="top-item-value">${(item.quantity * item.price).toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WarehouseDistribution({ inventory }) {
    const [hoveredWarehouse, setHoveredWarehouse] = useState(null);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [supportsHover, setSupportsHover] = useState(true);
    const locations = ['Warehouse A', 'Warehouse B', 'Warehouse C'];

    // Check if device supports hover (desktop) or touch (mobile/tablet)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover)');
        setSupportsHover(mediaQuery.matches);

        const handleChange = (e) => setSupportsHover(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const handleWarehouseClick = (location) => {
        // Toggle selection on click (works on both desktop and mobile)
        setSelectedWarehouse(selectedWarehouse === location ? null : location);
    };

    const handleMouseEnter = (location) => {
        if (supportsHover) {
            setHoveredWarehouse(location);
        }
    };

    const handleMouseLeave = () => {
        if (supportsHover) {
            setHoveredWarehouse(null);
        }
    };

    return (
        <div className="card">
            <h3 className="card-title">📍 Warehouse Distribution</h3>
            <p className="text-gray text-sm mb-1">
                {supportsHover ? 'Hover or click a warehouse to see its items' : 'Tap a warehouse to see its items (tap again to close)'}
            </p>
            <div className="warehouse-list">
                {locations.map(location => {
                    const items = inventory.filter(item => item.location === location);
                    const percentage = inventory.length > 0 ? (items.length / inventory.length * 100).toFixed(0) : 0;
                    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
                    const isHovered = hoveredWarehouse === location;
                    const isSelected = selectedWarehouse === location;
                    const showItems = (supportsHover && isHovered) || isSelected;

                    return (
                        <div key={location}
                            className={`warehouse-item ${isHovered || isSelected ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${!supportsHover ? 'clickable' : ''}`}
                            onMouseEnter={() => handleMouseEnter(location)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleWarehouseClick(location)}>
                            <div className="warehouse-info">
                                <span>{location}</span>
                                <span className="warehouse-count">{items.length} items (${totalValue.toLocaleString()})</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                            {showItems && items.length > 0 && (
                                <div className="warehouse-items">
                                    {items.map(item => (
                                        <div key={item.id} className="warehouse-item-detail">
                                            <div style={{ flex: 1 }}>
                                                <div className="warehouse-item-name">{item.name}</div>
                                                <div className="warehouse-item-category">{item.category}</div>
                                            </div>
                                            <div className="warehouse-item-stats">
                                                <div className={`warehouse-item-qty ${item.quantity <= item.minStock ? 'low' : 'good'}`}>Qty: {item.quantity}</div>
                                                <div className="warehouse-item-value">${(item.quantity * item.price).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TopSuppliers({ inventory }) {
    const [hoveredSupplier, setHoveredSupplier] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [supportsHover, setSupportsHover] = useState(true);

    const sortedSuppliers = useMemo(() => {
        const supplierData = {};
        inventory.forEach(item => {
            if (!supplierData[item.supplier]) supplierData[item.supplier] = { count: 0, totalValue: 0, items: [] };
            supplierData[item.supplier].count++;
            supplierData[item.supplier].totalValue += item.quantity * item.price;
            supplierData[item.supplier].items.push(item);
        });
        return Object.entries(supplierData).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
    }, [inventory]);

    const maxValue = sortedSuppliers[0]?.totalValue || 1;

    // Check if device supports hover (desktop) or touch (mobile/tablet)
    useEffect(() => {
        const mediaQuery = window.matchMedia('(hover: hover)');
        setSupportsHover(mediaQuery.matches);

        const handleChange = (e) => setSupportsHover(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const handleSupplierClick = (supplierName) => {
        // Toggle selection on click (works on both desktop and mobile)
        setSelectedSupplier(selectedSupplier === supplierName ? null : supplierName);
    };

    const handleMouseEnter = (supplierName) => {
        if (supportsHover) {
            setHoveredSupplier(supplierName);
        }
    };

    const handleMouseLeave = () => {
        if (supportsHover) {
            setHoveredSupplier(null);
        }
    };

    return (
        <div className="card">
            <h3 className="card-title">🏢 Top Suppliers</h3>
            <p className="text-gray text-sm mb-1">
                {supportsHover ? 'Hover or click a supplier to see their items' : 'Tap a supplier to see their items (tap again to close)'}
            </p>
            <div className="warehouse-list">
                {sortedSuppliers.map((supplier, index) => {
                    const percentage = ((supplier.totalValue / maxValue) * 100).toFixed(0);
                    const isHovered = hoveredSupplier === supplier.name;
                    const isSelected = selectedSupplier === supplier.name;
                    const showItems = (supportsHover && isHovered) || isSelected;

                    return (
                        <div key={supplier.name}
                            className={`warehouse-item ${isHovered || isSelected ? 'hovered' : ''} ${isSelected ? 'selected' : ''} ${!supportsHover ? 'clickable' : ''}`}
                            onMouseEnter={() => handleMouseEnter(supplier.name)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => handleSupplierClick(supplier.name)}>
                            <div className="warehouse-info">
                                <div>
                                    <span className="font-bold">{supplier.name}</span>
                                    <span className="text-gray text-xs" style={{ marginLeft: '8px' }}>#{index + 1}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <span className="warehouse-count" style={{ fontWeight: 600, color: '#10b981' }}>${supplier.totalValue.toLocaleString()}</span>
                                    <span className="text-gray text-xs">{supplier.count} items</span>
                                </div>
                            </div>
                            <div className="progress-bar">
                                <div className={`progress-fill ${index === 0 ? 'success' : ''}`} style={{ width: `${percentage}%` }}></div>
                            </div>
                            {showItems && supplier.items.length > 0 && (
                                <div className="warehouse-items">
                                    {supplier.items.map(item => (
                                        <div key={item.id} className="warehouse-item-detail">
                                            <div style={{ flex: 1 }}>
                                                <div className="warehouse-item-name">{item.name}</div>
                                                <div className="warehouse-item-category">{item.category}</div>
                                            </div>
                                            <div className="warehouse-item-stats">
                                                <div className={`warehouse-item-qty ${item.quantity <= item.minStock ? 'low' : 'good'}`}>Qty: {item.quantity}</div>
                                                <div className="warehouse-item-value">${(item.quantity * item.price).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function InventoryAppContent() {
    const { addAlert } = useAlert();
    const { isDark, toggle: toggleTheme } = useDarkMode();
    const {
        inventory, setInventory, stockMovements, setStockMovements,
        purchaseOrders, setPurchaseOrders, activities, setActivities,
        customCategories, setCustomCategories,
        isOnline, showOnlineBanner, setShowOnlineBanner,
        logActivity, addStockMovement
    } = useInventoryData(addAlert);

    const [view, setView] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [csvImportMode, setCsvImportMode] = useState('append');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
    const [showPOModal, setShowPOModal] = useState(false);
    const [showMovementHistoryModal, setShowMovementHistoryModal] = useState(false);
    const [historyItem, setHistoryItem] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [showBulkEditModal, setShowBulkEditModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageItem, setSelectedImageItem] = useState(null);
    const [showBackupModal, setShowBackupModal] = useState(false);
    const [viewingAttachment, setViewingAttachment] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    // PWA Install functionality
    const [installPrompt, setInstallPrompt] = useState(null);
    const [showInstallButton, setShowInstallButton] = useState(false);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); setShowInstallButton(true); };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        if (window.matchMedia('(display-mode: standalone)').matches) setShowInstallButton(false);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') { addAlert('App installed successfully!', 'success'); setShowInstallButton(false); }
        else addAlert('Installation cancelled', 'info');
        setInstallPrompt(null);
    };

    // Derived values using useMemo
    const inventoryCategories = useMemo(() => [...new Set(inventory.map(item => item.category))], [inventory]);
    const allCategories = useMemo(() => [...new Set([...inventoryCategories, ...customCategories])], [inventoryCategories, customCategories]);
    const categories = useMemo(() => ['All', ...allCategories.sort()], [allCategories]);
    const lowStockItems = useMemo(() => inventory.filter(item => item.quantity <= item.minStock), [inventory]);
    const totalValue = useMemo(() => inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0), [inventory]);

    const closeAllModals = () => {
        setShowAddModal(false); setShowImportModal(false); setShowEditModal(false); setShowAddCategoryModal(false);
        setEditingItem(null); setShowImageModal(false); setSelectedImageItem(null); setShowStockAdjustModal(false);
        setShowPOModal(false); setShowMovementHistoryModal(false); setHistoryItem(null); setShowBulkEditModal(false);
        setShowBackupModal(false); setIsMenuOpen(false);
    };

    // Utils.generatePDFReport is used from global Utils


    useEffect(() => {
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                closeAllModals();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    useEffect(() => {
        if (view === 'analytics' && chartRef.current) {
            if (chartInstance.current) chartInstance.current.destroy();
            const ctx = chartRef.current.getContext('2d');
            const categoryData = {};
            inventory.forEach(item => { categoryData[item.category] = (categoryData[item.category] || 0) + item.quantity; });

            // Check if mobile
            const isMobile = window.innerWidth <= 480;

            // Get current theme from HTML attribute
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const isDarkMode = currentTheme === 'dark';

            chartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(categoryData),
                    datasets: [{
                        data: Object.values(categoryData),
                        backgroundColor: ['#0D9488', '#B45309', '#14B8A6', '#D97706', '#0F766E', '#92400E', '#5EEAD4', '#FDBA74']
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: isMobile ? 'right' : 'bottom',
                            align: isMobile ? 'center' : 'center',
                            labels: {
                                boxWidth: isMobile ? 12 : 20,
                                padding: isMobile ? 6 : 15,
                                font: {
                                    size: isMobile ? 10 : 13
                                },
                                usePointStyle: true,
                                pointStyle: 'circle',
                                color: isDarkMode ? '#ffffff' : '#374151'
                            },
                            maxWidth: isMobile ? 150 : undefined
                        }
                    },
                    layout: {
                        padding: {
                            bottom: isMobile ? 5 : 20,
                            right: isMobile ? 10 : 20
                        }
                    }
                }
            });

            // Handle window resize
            const handleResize = () => {
                if (chartInstance.current) {
                    const newIsMobile = window.innerWidth <= 480;
                    chartInstance.current.options.plugins.legend.position = newIsMobile ? 'right' : 'bottom';
                    chartInstance.current.options.plugins.legend.labels.font.size = newIsMobile ? 10 : 13;
                    chartInstance.current.options.plugins.legend.labels.boxWidth = newIsMobile ? 12 : 20;
                    chartInstance.current.update();
                }
            };

            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                if (chartInstance.current) chartInstance.current.destroy();
            };
        }
        return () => { if (chartInstance.current) chartInstance.current.destroy(); };
    }, [view, inventory, isDark]);

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => { setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    };

    const resetToDefault = () => {
        if (confirm('Are you sure you want to reset to default sample data? This will clear current inventory.')) {
            setInventory(INITIAL_INVENTORY);
            setStockMovements([]);
            setPurchaseOrders([]);
            setActivities([]);
            setCustomCategories([]);
            localStorage.clear();
            addAlert('System reset to default sample data', 'success');
        }
    };

    const clearAllData = () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            setInventory([]);
            setStockMovements([]);
            setPurchaseOrders([]);
            setActivities([]);
            setCustomCategories([]);
            localStorage.clear();
            addAlert('All data has been cleared', 'warning');
        }
    };

    const exportAllData = () => {
        const data = {
            inventory, stockMovements, purchaseOrders, activities, customCategories,
            version: '1.0', exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        addAlert('Backup file generated successfully', 'success');
    };

    const importAllData = (jsonString, merge = false) => {
        try {
            const data = JSON.parse(jsonString);
            if (!data.inventory || !Array.isArray(data.inventory)) {
                throw new Error('Invalid backup file: missing inventory data');
            }

            if (merge) {
                setInventory(prev => {
                    const mergedInventory = [...prev];
                    let addedCount = 0;
                    let updatedCount = 0;

                    data.inventory.forEach(importedItem => {
                        const existingIndex = mergedInventory.findIndex(item => String(item.id) === String(importedItem.id));
                        if (existingIndex >= 0) {
                            mergedInventory[existingIndex] = { ...mergedInventory[existingIndex], ...importedItem };
                            updatedCount++;
                        } else {
                            mergedInventory.push(importedItem);
                            addedCount++;
                        }
                    });

                    setTimeout(() => {
                        logActivity('IMPORT', `Merged backup: ${addedCount} items added, ${updatedCount} updated`);
                        addAlert(`Merge complete: ${addedCount} items added, ${updatedCount} updated!`, 'success');
                    }, 0);

                    return mergedInventory;
                });

                if (data.stockMovements) {
                    setStockMovements(prev => {
                        const existingIds = new Set(prev.map(m => String(m.id)));
                        const newMovements = data.stockMovements.filter(m => !existingIds.has(String(m.id)));
                        return [...prev, ...newMovements];
                    });
                }
                if (data.purchaseOrders) {
                    setPurchaseOrders(prev => {
                        const existingIds = new Set(prev.map(po => String(po.id)));
                        const newOrders = data.purchaseOrders.filter(po => !existingIds.has(String(po.id)));
                        return [...prev, ...newOrders];
                    });
                }
            } else {
                setInventory(data.inventory);
                if (data.stockMovements) setStockMovements(data.stockMovements);
                if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
                if (data.activities) setActivities(data.activities);
                if (data.customCategories) setCustomCategories(data.customCategories);

                logActivity('IMPORT', `Restored full backup from ${new Date(data.exportDate).toLocaleDateString()}`);
                addAlert(`Backup restored successfully! ${data.inventory.length} items loaded.`, 'success');
            }
            return { success: true };
        } catch (error) {
            addAlert('Error importing backup: ' + error.message, 'error');
            return { success: false, error: error.message };
        }
    };

    const exportToCSV = () => {
        const headers = ['name', 'category', 'quantity', 'minStock', 'price', 'supplier', 'location'];
        const csvContent = [
            headers.join(','),
            ...inventory.map(item => headers.map(header => {
                const val = item[header] || '';
                return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `inventory-manager-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addAlert('Inventory exported to CSV', 'success');
    };

    const openEditModal = (item) => { setEditingItem({ ...item }); setShowEditModal(true); };

    const updateItem = (updatedItem) => {
        setInventory(prev => prev.map(item => String(item.id) === String(updatedItem.id) ? updatedItem : item));

        const oldItem = inventory.find(i => String(i.id) === String(updatedItem.id));
        if (oldItem) {
            const changes = [];
            if (oldItem.quantity !== updatedItem.quantity) {
                changes.push(`quantity: ${oldItem.quantity} → ${updatedItem.quantity}`);
                const diff = updatedItem.quantity - oldItem.quantity;
                if (diff !== 0) addStockMovement(updatedItem.id, updatedItem.name, diff > 0 ? 'INCREASE' : 'DECREASE', Math.abs(diff), 'Manual adjustment', oldItem.quantity, updatedItem.quantity);
            }
            if (oldItem.price !== updatedItem.price) changes.push(`Price: $${oldItem.price} → $${updatedItem.price}`);
            if (oldItem.minStock !== updatedItem.minStock) changes.push(`Min Stock: ${oldItem.minStock} → ${updatedItem.minStock}`);
            if (changes.length > 0) logActivity('UPDATE', `Updated ${updatedItem.name}`, changes.join(', '), updatedItem.id, updatedItem.name);
        }

        setShowEditModal(false); setEditingItem(null);
        queueChange('UPDATE', { id: updatedItem.id });
    };

    const addNewItem = (newItem) => {
        setInventory(prev => {
            const maxId = prev.length > 0 ? Math.max(...prev.map(item => Number(item.id) || 0)) : 0;
            const newItemWithId = { ...newItem, id: maxId + 1 };

            // Side effects should ideally be outside, but for simple logging/alerts it's okay here or after
            setTimeout(() => {
                logActivity('CREATE', `Added new item: ${newItem.name}`, newItem, newItemWithId.id, newItem.name);
                addStockMovement(newItemWithId.id, newItemWithId.name, 'INITIAL', newItemWithId.quantity, 'Initial stock', 0, newItemWithId.quantity);
                addAlert(`Successfully added: ${newItem.name}`, 'success');
                queueChange('CREATE', { id: newItemWithId.id, name: newItem.name });
            }, 0);

            return [...prev, newItemWithId];
        });
        setShowAddModal(false);
    };

    const deleteItem = (id) => {
        const item = inventory.find(i => String(i.id) === String(id));
        if (!item) return;

        if (confirm(`Are you sure you want to delete ${item.name}?`)) {
            setInventory(prev => prev.filter(item => String(item.id) !== String(id)));
            logActivity('DELETE', `Deleted item: ${item.name}`, item, item.id, item.name);
            addStockMovement(item.id, item.name, 'DELETE', item.quantity, 'Item deleted', item.quantity, 0);
            setShowEditModal(false); setEditingItem(null);
            queueChange('DELETE', { id: item.id, name: item.name });
        }
    };

    const toggleItemSelection = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) newSelected.delete(itemId); else newSelected.add(itemId);
        setSelectedItems(newSelected);
    };

    const selectAllItems = () => {
        if (selectedItems.size === filteredInventory.length) setSelectedItems(new Set());
        else setSelectedItems(new Set(filteredInventory.map(item => item.id)));
    };

    const deleteSelectedItems = () => {
        if (selectedItems.size === 0) { addAlert('Please select items to delete', 'warning'); return; }
        if (confirm(`Are you sure you want to delete ${selectedItems.size} items?`)) {
            setInventory(prev => {
                const itemsToDelete = prev.filter(item => selectedItems.has(item.id));
                itemsToDelete.forEach(item => addStockMovement(item.id, item.name, 'DELETE', item.quantity, 'Bulk delete', item.quantity, 0));
                return prev.filter(item => !selectedItems.has(item.id));
            });
            logActivity('DELETE', `Bulk deleted ${selectedItems.size} items`, `Deleted IDs: ${Array.from(selectedItems).join(', ')}`);
            setSelectedItems(new Set());
        }
    };

    const handleFileUpload = (file) => {
        if (!file) return;
        if (!file.name.endsWith('.csv')) { addAlert('Please upload a CSV file', 'warning'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const newItems = Utils.parseCSV(text);
                if (newItems.length === 0) { addAlert('No valid items found in CSV', 'error'); return; }

                if (csvImportMode === 'update') {
                    setInventory(prev => {
                        let updatedCount = 0;
                        let addedCount = 0;
                        const updatedInventory = [...prev];

                        newItems.forEach(newItem => {
                            const existingIndex = updatedInventory.findIndex(item =>
                                item.name.toLowerCase() === newItem.name.toLowerCase()
                            );

                            if (existingIndex >= 0) {
                                const oldItem = updatedInventory[existingIndex];
                                updatedInventory[existingIndex] = {
                                    ...oldItem,
                                    ...newItem,
                                    id: oldItem.id,
                                    images: oldItem.images || []
                                };
                                if (oldItem.quantity !== newItem.quantity) {
                                    addStockMovement(oldItem.id, newItem.name, 'UPDATE', newItem.quantity, 'CSV import update', oldItem.quantity, newItem.quantity);
                                }
                                updatedCount++;
                            } else {
                                const maxId = updatedInventory.length > 0 ? Math.max(...updatedInventory.map(item => Number(item.id) || 0)) : 0;
                                const itemWithId = { ...newItem, id: maxId + 1 };
                                updatedInventory.push(itemWithId);
                                addStockMovement(itemWithId.id, itemWithId.name, 'IMPORT', itemWithId.quantity, 'CSV import', 0, itemWithId.quantity);
                                addedCount++;
                            }
                        });

                        setTimeout(() => {
                            logActivity('IMPORT', `CSV Import: ${updatedCount} updated, ${addedCount} added`);
                            addAlert(`Import complete: ${updatedCount} items updated, ${addedCount} items added!`, 'success');
                        }, 0);

                        return updatedInventory;
                    });
                } else {
                    setInventory(prev => {
                        const maxId = prev.length > 0 ? Math.max(...prev.map(item => Number(item.id) || 0)) : 0;
                        const itemsWithIds = newItems.map((item, index) => ({ ...item, id: maxId + index + 1 }));

                        setTimeout(() => {
                            logActivity('IMPORT', `Imported ${itemsWithIds.length} items from CSV`);
                            itemsWithIds.forEach(item => addStockMovement(item.id, item.name, 'IMPORT', item.quantity, 'CSV import', 0, item.quantity));
                            addAlert(`Successfully imported ${itemsWithIds.length} items!`, 'success');
                        }, 0);

                        return [...prev, ...itemsWithIds];
                    });
                }
                setShowImportModal(false);
            } catch (error) { addAlert('Error parsing CSV file: ' + error.message, 'error'); }
        };
        reader.readAsText(file);
    };

    // Utils.parseCSV is used from the global Utils namespace



    // ========== BACKUP & RESTORE FUNCTIONS ==========
    const addCategory = (categoryName) => {
        const trimmedName = categoryName.trim();
        if (!trimmedName) { addAlert('Category name cannot be empty', 'warning'); return; }
        if (allCategories.includes(trimmedName)) { addAlert('This category already exists', 'warning'); return; }
        setCustomCategories([...customCategories, trimmedName]);
        logActivity('SYSTEM', `Added new category: ${trimmedName}`);
        setShowAddCategoryModal(false);
    };

    const handleImageUpload = async (itemId, files) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        for (const file of fileArray) {
            if (!allowedTypes.includes(file.type)) { addAlert(`File ${file.name} is not a valid image type.`, 'error'); continue; }
            if (file.size > maxSize) { addAlert(`File ${file.name} is too large. Max 5MB.`, 'warning'); continue; }

            try {
                addAlert(`Optimizing ${file.name} for sync...`, 'info');
                const compressedData = await Utils.compressImage(file);
                console.log(`📸 Image optimized: ${file.name} (${Math.round(compressedData.length / 1024)} KB)`);

                let itemName = '';
                setInventory(prev => prev.map(item => {
                    if (String(item.id) === String(itemId)) {
                        itemName = item.name;
                        const updatedImages = [...(item.images || []), compressedData];
                        return { ...item, images: updatedImages };
                    }
                    return item;
                }));

                if (itemName) logActivity('IMPORT', `Added image to ${itemName}`);

                addAlert(`${file.name} added!`, 'success');
            } catch (error) {
                console.error('Image processing error:', error);
                addAlert(`Failed to process ${file.name}`, 'error');
            }
        }
    };

    const deleteImage = async (itemId, imageIndex) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        let itemName = '';
        setInventory(prev => prev.map(item => {
            if (String(item.id) === String(itemId)) {
                itemName = item.name;
                const updatedImages = (item.images || []).filter((_, index) => index !== imageIndex);
                return { ...item, images: updatedImages };
            }
            return item;
        }));

        if (itemName) logActivity('DELETE', `Removed image from ${itemName}`);
    };

    const openImageGallery = (item) => { setSelectedImageItem(item); setShowImageModal(true); };

    const handleStockAdjustment = (item, adjustment, reason) => {
        const newQty = Math.max(0, item.quantity + adjustment);
        const updatedItem = { ...item, quantity: newQty };
        setInventory(prev => prev.map(i => String(i.id) === String(item.id) ? updatedItem : i));
        addStockMovement(item.id, item.name, adjustment > 0 ? 'INCREASE' : 'DECREASE', Math.abs(adjustment), reason, item.quantity, newQty);
        logActivity('STOCK', `Stock ${adjustment > 0 ? 'added' : 'removed'}: ${item.name}`, `${Math.abs(adjustment)} units - ${reason}`, item.id, item.name);
        setShowStockAdjustModal(false);
    };

    const generatePurchaseOrder = (items, supplier, notes, attachments = []) => {
        const po = {
            id: `PO-${Date.now()}`, date: new Date().toISOString(), supplier,
            items: items.map(item => {
                const orderQty = item.orderQty || Math.max(item.minStock - item.quantity, 0) + 10;
                return {
                    itemId: item.id,
                    name: item.name,
                    currentQty: item.quantity,
                    minStock: item.minStock,
                    orderQty: orderQty,
                    unitPrice: item.price,
                    total: orderQty * item.price
                };
            }),
            totalAmount: items.reduce((sum, item) => {
                const orderQty = item.orderQty || Math.max(item.minStock - item.quantity, 0) + 10;
                return sum + orderQty * item.price;
            }, 0),
            status: 'DRAFT', notes, attachments
        };
        setPurchaseOrders([po, ...purchaseOrders]);
        logActivity('SYSTEM', `Generated Purchase Order ${po.id} for ${supplier}`, `${items.length} items`);
        setShowPOModal(false);
        addAlert(`Purchase Order ${po.id} created successfully!`, 'success');
    };

    const exportPOToCSV = (po) => {
        const headers = ['Item Name', 'Current Qty', 'Min Stock', 'Order Qty', 'Unit Price', 'Total'];
        const rows = po.items.map(item => [item.name, item.currentQty, item.minStock, item.orderQty, item.unitPrice, item.total]);
        const csvContent = [`Purchase Order: ${po.id}`, `Date: ${new Date(po.date).toLocaleDateString()}`, `Supplier: ${po.supplier}`, `Status: ${po.status}`, '', headers.join(','), ...rows.map(row => row.join(',')), '', `Total Amount:,${po.totalAmount}`].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${po.id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleBulkEdit = (field, value) => {
        setInventory(prev => {
            return prev.map(item => {
                if (selectedItems.has(item.id)) {
                    const oldValue = item[field];
                    const newItem = { ...item, [field]: value };

                    if (field === 'quantity' && oldValue !== value) {
                        setTimeout(() => addStockMovement(item.id, item.name, value > oldValue ? 'INCREASE' : 'DECREASE', Math.abs(value - oldValue), 'Bulk edit', oldValue, value), 0);
                    }
                    return newItem;
                }
                return item;
            });
        });

        logActivity('UPDATE', `Bulk edited ${selectedItems.size} items - set ${field} to ${value}`);
        setShowBulkEditModal(false);
        setSelectedItems(new Set());
    };

    const getMovementBadgeClass = (type) => {
        switch (type) {
            case 'INCREASE': return 'badge-increase';
            case 'DECREASE': return 'badge-decrease';
            case 'INITIAL': return 'badge-initial';
            case 'IMPORT': return 'badge-import';
            case 'DELETE': return 'badge-delete';
            default: return '';
        }
    };

    return (
        <div className="app-container">
            <header className="header">
                <div className="header-content">
                    <div className="logo">
                        <img src="../Images/logo.svg" alt="Inventory Manager Logo" className="logo-img" onerror="this.style.display='none'" />
                        <div>
                            <h1 className="logo-text">Inventory Manager</h1>
                            <p className="logo-subtext">Demo Version</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="active-view-indicator">
                            {view === 'dashboard' && '📊 Dashboard'}
                            {view === 'inventory' && '📦 Inventory'}
                            {view === 'analytics' && '📈 Analytics'}
                            {view === 'catalog' && '🖼️ Catalog'}
                            {view === 'operations' && '⚙️ Operations'}
                            {view === 'audit' && '📜 Audit Log'}
                        </div>

                        <div className={`menu-toggle ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>

                    <nav className={`nav-container ${isMenuOpen ? 'open' : ''}`}>
                        {/* Main Navigation */}
                        <div className="nav-section">
                            <button className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => { setView('dashboard'); setIsMenuOpen(false); }}>📊 Dashboard</button>
                            <button className={`nav-btn ${view === 'inventory' ? 'active' : ''}`} onClick={() => { setView('inventory'); setIsMenuOpen(false); }}>📦 Inventory</button>
                            <button className={`nav-btn ${view === 'analytics' ? 'active' : ''}`} onClick={() => { setView('analytics'); setIsMenuOpen(false); }}>📈 Analytics</button>
                            <button className={`nav-btn ${view === 'catalog' ? 'active' : ''}`} onClick={() => { setView('catalog'); setIsMenuOpen(false); }}>🖼️ Catalog</button>
                            <button className={`nav-btn ${view === 'operations' ? 'active' : ''}`} onClick={() => { setView('operations'); setIsMenuOpen(false); }}>⚙️ Operations</button>
                            <button className={`nav-btn ${view === 'audit' ? 'active' : ''}`} onClick={() => { setView('audit'); setIsMenuOpen(false); }}>📜 Audit Log</button>
                        </div>

                        {/* Contact Section */}
                        <div className="nav-section">
                            <div className="sync-header">📬 Get Full Version</div>
                            <div className="sync-content">
                                <div className="sync-message">Cloud sync, bulk ops & more</div>
                                <a href="mailto:omar9007@gmail.com" className="btn btn-sm btn-primary" style={{ marginTop: '8px', textDecoration: 'none', textAlign: 'center' }}>📧 Contact</a>
                            </div>
                        </div>
                    </nav>
                </div>
            </header>



            <main className="main-content">
                {view === 'dashboard' && (
                    <DashboardView
                        inventory={inventory} lowStockItems={lowStockItems} totalValue={totalValue} activities={activities} categories={categories}
                        setShowAddModal={setShowAddModal} setShowPOModal={setShowPOModal} setShowImportModal={setShowImportModal} setShowBackupModal={setShowBackupModal}
                        exportToCSV={exportToCSV} resetToDefault={resetToDefault} clearAllData={clearAllData}
                    />
                )}

                {view === 'inventory' && (
                    <InventoryView
                        inventory={inventory} categories={categories} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
                        filteredInventory={filteredInventory}
                        openImageGallery={openImageGallery} openEditModal={openEditModal} setShowAddCategoryModal={setShowAddCategoryModal} setShowAddModal={setShowAddModal}
                        setEditingItem={setEditingItem} setShowStockAdjustModal={setShowStockAdjustModal}
                        setHistoryItem={setHistoryItem} setShowMovementHistoryModal={setShowMovementHistoryModal}
                    />
                )}

                {view === 'analytics' && (
                    <AnalyticsView inventory={inventory} stockMovements={stockMovements} chartRef={chartRef} generatePDFReport={() => Utils.generatePDFReport(inventory, addAlert)} />
                )}

                {view === 'catalog' && (
                    <CatalogView
                        inventory={inventory} categories={categories} searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterCategory={filterCategory} setFilterCategory={setFilterCategory}
                        filteredInventory={filteredInventory} openImageGallery={openImageGallery} openEditModal={openEditModal}
                    />
                )}

                {view === 'audit' && (
                    <AuditLogView activities={activities} />
                )}

                {view === 'operations' && (
                    <OperationsView
                        stockMovements={stockMovements} purchaseOrders={purchaseOrders} setShowPOModal={setShowPOModal}
                        exportPOToCSV={exportPOToCSV} setViewingAttachment={setViewingAttachment} getMovementBadgeClass={getMovementBadgeClass}
                    />
                )}
            </main>

            {/* Attachment Viewer Modal */}
            <AttachmentViewerModal attachment={viewingAttachment} onClose={() => setViewingAttachment(null)} />

            {/* Modals */}

            {showStockAdjustModal && editingItem && (
                <StockAdjustmentModal item={editingItem} onClose={() => { setShowStockAdjustModal(false); setEditingItem(null); }} onAdjust={handleStockAdjustment} />
            )}
            {showPOModal && (
                <PurchaseOrderModal inventory={inventory} lowStockItems={lowStockItems} onClose={() => setShowPOModal(false)} onGenerate={generatePurchaseOrder} />
            )}
            {showMovementHistoryModal && historyItem && (
                <MovementHistoryModal item={historyItem} movements={stockMovements.filter(m => m.itemId === historyItem.id)} onClose={() => { setShowMovementHistoryModal(false); setHistoryItem(null); }} />
            )}

            {showImageModal && selectedImageItem && (
                <ImageGalleryModal item={selectedImageItem} onClose={() => { setShowImageModal(false); setSelectedImageItem(null); }} onUpload={(files) => handleImageUpload(selectedImageItem.id, files)} onDelete={(imageIndex) => deleteImage(selectedImageItem.id, imageIndex)} />
            )}
            <PrintReportTemplate inventory={inventory} totalValue={totalValue} />

            {showAddModal && (
                <AddItemModal onClose={() => setShowAddModal(false)} onAdd={addNewItem} categories={categories.filter(c => c !== 'All')} onAlert={addAlert} />
            )}
            {showImportModal && (
                <ImportCSVModal
                    onClose={() => setShowImportModal(false)}
                    csvImportMode={csvImportMode}
                    setCsvImportMode={setCsvImportMode}
                    isDragging={isDragging}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    fileInputRef={fileInputRef}
                    handleFileUpload={handleFileUpload}
                    exportToCSV={exportToCSV}
                />
            )}
            {showEditModal && editingItem && (
                <EditItemModal item={editingItem} onClose={() => { setShowEditModal(false); setEditingItem(null); }} onSave={updateItem} onDelete={deleteItem} onAlert={addAlert} />
            )}
            {showAddCategoryModal && (
                <AddCategoryModal onClose={() => setShowAddCategoryModal(false)} onAdd={addCategory} existingCategories={allCategories} />
            )}
            {showBackupModal && (
                <BackupRestoreModal
                    onClose={() => setShowBackupModal(false)}
                    onExport={exportAllData}
                    onImport={importAllData}
                    inventory={inventory}
                    stockMovements={stockMovements}
                    purchaseOrders={purchaseOrders}
                    categories={categories}
                />
            )}

            <OfflineBanner isOnline={isOnline} show={showOnlineBanner} onClose={() => setShowOnlineBanner(false)} />
            <ThemeToggle isDark={isDark} toggle={toggleTheme} />
        </div>
    );
}

function InventoryApp() {
    return (
        <AlertProvider>
            <InventoryAppContent />
        </AlertProvider>
    );
}

function StockAdjustmentModal({ item, onClose, onAdjust }) {
    const { addAlert } = useAlert();
    const [adjustment, setAdjustment] = useState('');
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const reasons = ['Physical Count', 'Damaged', 'Lost', 'Found', 'Returned', 'Correction', 'Other'];

    const handleSubmit = (e) => {
        e.preventDefault();
        const adj = parseInt(adjustment);
        if (isNaN(adj) || adj === 0) { addAlert('Please enter a valid adjustment amount', 'warning'); return; }
        const finalReason = reason === 'Other' ? customReason : reason;
        if (!finalReason) { addAlert('Please select or enter a reason', 'warning'); return; }
        onAdjust(item, adj, finalReason);
    };

    const newQuantity = item.quantity + (parseInt(adjustment) || 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">📊 Stock Adjustment</h2>
                <p className="modal-subtitle">Adjusting: <strong>{item.name}</strong></p>
                <div className="adjustment-preview">
                    <div className="adjustment-row"><span>Current Quantity:</span><strong>{item.quantity}</strong></div>
                    <div className="adjustment-row">
                        <span>Adjustment:</span>
                        <strong className={`adjustment-value ${adjustment > 0 ? 'positive' : adjustment < 0 ? 'negative' : ''}`}>{adjustment > 0 ? '+' : ''}{adjustment || 0}</strong>
                    </div>
                    <div className="adjustment-row">
                        <span>New Quantity:</span>
                        <strong className={`adjustment-value total ${newQuantity < 0 ? 'warning' : ''}`}>{newQuantity}</strong>
                    </div>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Adjustment Amount (+/-)</label>
                        <input type="number" className="form-input" placeholder="Enter positive to add, negative to remove" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Reason</label>
                        <select className="form-select" value={reason} onChange={(e) => setReason(e.target.value)}>
                            <option value="">Select a reason...</option>
                            {reasons.map(r => (<option key={r} value={r}>{r}</option>))}
                        </select>
                        {reason === 'Other' && (
                            <input type="text" className="form-input mt-1" placeholder="Enter custom reason" value={customReason} onChange={(e) => setCustomReason(e.target.value)} />
                        )}
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                        <button type="submit" className="btn" style={{ flex: '1 1 0px', background: adjustment < 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>{adjustment < 0 ? '➖ Remove Stock' : '➕ Add Stock'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function PurchaseOrderModal({ inventory, lowStockItems, onClose, onGenerate }) {
    const { addAlert } = useAlert();
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [notes, setNotes] = useState('');
    const [includeAllLowStock, setIncludeAllLowStock] = useState(true);
    const [selectedItems, setSelectedItems] = useState(new Set(lowStockItems.map(i => i.id)));
    const [orderQuantities, setOrderQuantities] = useState(() => {
        const quantities = {};
        inventory.forEach(item => {
            quantities[item.id] = Math.max(item.minStock - item.quantity, 0) + 10;
        });
        return quantities;
    });

    const suppliers = [...new Set(inventory.map(item => item.supplier))];
    const filteredItems = includeAllLowStock ? lowStockItems : inventory.filter(item => item.supplier === selectedSupplier && item.quantity <= item.minStock);

    const toggleItem = (itemId) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(itemId)) newSelected.delete(itemId); else newSelected.add(itemId);
        setSelectedItems(newSelected);
    };

    const handleQuantityChange = (itemId, value) => {
        const qty = parseInt(value) || 0;
        setOrderQuantities(prev => ({ ...prev, [itemId]: Math.max(0, qty) }));
    };

    const [attachments, setAttachments] = useState([]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAttachments(prev => [...prev, { name: file.name, type: file.type, data: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleGenerate = () => {
        const items = inventory.filter(item => selectedItems.has(item.id));
        if (items.length === 0) { addAlert('Please select at least one item', 'warning'); return; }
        const supplier = selectedSupplier || items[0].supplier;
        // Add orderQty to each item
        const itemsWithQty = items.map(item => ({
            ...item,
            orderQty: orderQuantities[item.id] || Math.max(item.minStock - item.quantity, 0) + 10
        }));
        onGenerate(itemsWithQty, supplier, notes, attachments);
    };

    const totalAmount = inventory.filter(item => selectedItems.has(item.id)).reduce((sum, item) => {
        const orderQty = orderQuantities[item.id] || Math.max(item.minStock - item.quantity, 0) + 10;
        return sum + (orderQty * item.price);
    }, 0);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" style={{ maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">📋 Create Purchase Order</h2>
                <div className="mb-2">
                    <div className="flex gap-2 mb-2">
                        <label className="checkbox-label">
                            <input type="checkbox" checked={includeAllLowStock} onChange={(e) => { setIncludeAllLowStock(e.target.checked); if (e.target.checked) setSelectedItems(new Set(lowStockItems.map(i => i.id))); }} />
                            <span>Include all low stock items</span>
                        </label>
                    </div>
                    {!includeAllLowStock && (
                        <select className="form-select mb-2" value={selectedSupplier} onChange={(e) => { setSelectedSupplier(e.target.value); const supplierItems = inventory.filter(i => i.supplier === e.target.value && i.quantity <= i.minStock); setSelectedItems(new Set(supplierItems.map(i => i.id))); }}>
                            <option value="">Select supplier...</option>
                            {suppliers.map(s => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    )}
                    <input type="text" className="form-input" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="po-table-container">
                    {filteredItems.length === 0 ? (
                        <div className="text-center text-gray" style={{ padding: '40px' }}>No low stock items found</div>
                    ) : (
                        <table className="po-table">
                            <thead>
                                <tr>
                                    <th className="text-center" style={{ width: '40px' }}>
                                        <input type="checkbox" checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                                            onChange={() => { if (selectedItems.size === filteredItems.length) setSelectedItems(new Set()); else setSelectedItems(new Set(filteredItems.map(i => i.id))); }} />
                                    </th>
                                    <th>Item</th>
                                    <th className="text-center">Current</th>
                                    <th className="text-center">Min</th>
                                    <th className="text-center">Order Qty</th>
                                    <th className="text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => {
                                    const orderQty = orderQuantities[item.id] || Math.max(item.minStock - item.quantity, 0) + 10;
                                    return (
                                        <tr key={item.id}>
                                            <td className="text-center"><input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleItem(item.id)} /></td>
                                            <td>
                                                <div className="po-item-name">{item.name}</div>
                                                <div className="po-item-supplier">{item.supplier}</div>
                                            </td>
                                            <td className="po-qty-current">{item.quantity}</td>
                                            <td className="text-center">{item.minStock}</td>
                                            <td className="po-qty-order">
                                                <input
                                                    type="number"
                                                    className="form-input po-qty-input"
                                                    value={orderQty}
                                                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                                    min="0"
                                                    style={{ width: '70px', textAlign: 'center', padding: '4px 8px' }}
                                                />
                                            </td>
                                            <td className="po-total-cell">${(orderQty * item.price).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="po-summary">
                    <span className="po-summary-count">{selectedItems.size} items selected</span>
                    <span className="po-summary-total">Total: ${totalAmount.toLocaleString()}</span>
                </div>
                <div className="attachments-section mb-3">
                    <label className="form-label">Attachments (PDF/Images)</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {attachments.map((file, idx) => (
                            <div key={idx} className="attachment-badge">
                                <span>{file.type.includes('image') ? '🖼️' : '📄'} {file.name}</span>
                                <button type="button" className="attachment-remove" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}>×</button>
                            </div>
                        ))}
                    </div>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => document.getElementById('po-file-input').click()}>📎 Add Attachment</button>
                    <input id="po-file-input" type="file" multiple style={{ display: 'none' }} onChange={handleFileSelect} />
                </div>
                <div className="modal-buttons">

                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                    <button onClick={handleGenerate} disabled={selectedItems.size === 0} className="btn btn-primary" style={{ flex: '1 1 0px', opacity: selectedItems.size === 0 ? 0.5 : 1, cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer' }}>📋 Generate PO</button>
                </div>
            </div>
        </div>
    );
}

function MovementHistoryModal({ item, movements, onClose }) {
    const { addAlert } = useAlert();
    // Utils.getTimeAgo is used from global Utils

    const getMovementClass = (type) => {
        switch (type) {
            case 'INCREASE': return 'increase';
            case 'DECREASE': return 'decrease';
            case 'INITIAL': return 'initial';
            case 'DELETE': return 'delete';
            default: return '';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" style={{ maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">📜 Stock Movement History</h2>
                <p className="modal-subtitle">Item: <strong>{item.name}</strong></p>
                <div className="max-h-400 overflow-auto">
                    {movements.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📜</div>
                            <p className="empty-state-text">No movement history for this item.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {movements.map((movement) => (
                                <div key={movement.id} className={`movement-card ${getMovementClass(movement.type)}`}>
                                    <div className="movement-header">
                                        <span className={`badge-status ${movement.type === 'INCREASE' ? 'badge-increase' : movement.type === 'DECREASE' ? 'badge-decrease' : movement.type === 'INITIAL' ? 'badge-initial' : 'badge-delete'}`}>{movement.type}</span>
                                        <span className="text-gray text-sm">{Utils.getTimeAgo(movement.timestamp)}</span>
                                    </div>
                                    <div className="movement-body">
                                        <div>
                                            <div className="movement-change">{movement.previousQty} → {movement.newQty} units</div>
                                            <div className="movement-details">Change: {movement.type === 'DECREASE' ? '-' : '+'}{movement.quantity} • {movement.reason}</div>
                                        </div>
                                        <div className="movement-user">by {movement.user}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="modal-buttons mt-2">
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Close</button>
                </div>
            </div>
        </div>
    );
}

function AddCategoryModal({ onClose, onAdd, existingCategories }) {
    const { addAlert } = useAlert();
    const [categoryName, setCategoryName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(categoryName);
        setCategoryName('');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">🏷️ Add New Category</h2>
                <p className="text-gray mb-2">Create a custom category for your inventory items</p>
                <form onSubmit={handleSubmit}>
                    <input type="text" className="form-input mb-2" placeholder="Category name (e.g., Transformers, Meters, etc.)" required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
                    {existingCategories.length > 0 && (
                        <div className="category-list">
                            <div className="category-list-title">Existing Categories:</div>
                            <div className="category-tags">
                                {existingCategories.map(cat => (<span key={cat} className="category-tag">{cat}</span>))}
                            </div>
                        </div>
                    )}
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                        <button type="submit" className="btn btn-secondary" style={{ flex: '1 1 0px' }}>➕ Add Category</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function EditItemModal({ item, onClose, onSave, onDelete, onAlert }) {
    const [formData, setFormData] = useState({ ...item, quantity: item.quantity.toString(), minStock: item.minStock.toString(), price: item.price.toString() });
    const [isDraggingImages, setIsDraggingImages] = useState(false);
    const editImageInputRef = useRef(null);

    const handleImageUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        for (const file of fileArray) {
            if (!allowedTypes.includes(file.type)) { onAlert && onAlert(`File ${file.name} is not a valid image type.`, 'error'); continue; }
            if (file.size > maxSize) { onAlert && onAlert(`File ${file.name} is too large. Max 5MB.`, 'warning'); continue; }

            try {
                const compressedData = await Utils.compressImage(file);
                setFormData(prev => ({ ...prev, images: [...(prev.images || []), compressedData] }));
            } catch (error) {
                console.error('Image processing error:', error);
                onAlert && onAlert(`Failed to process ${file.name}`, 'error');
            }
        }
    };

    const removeImage = (imageIndex) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, index) => index !== imageIndex) })); };

    const handleSaveWithImages = (e) => {
        e.preventDefault();
        const updatedItem = { ...item, ...formData, quantity: parseInt(formData.quantity) || 0, minStock: parseInt(formData.minStock) || 0, price: parseFloat(formData.price) || 0 };
        onSave(updatedItem);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">✏️ Edit Item</h2>
                <p className="text-gray mb-2">{item.name}</p>
                <form onSubmit={handleSaveWithImages}>
                    <div className="form-group">
                        <label className="form-label">📸 Product Images</label>
                        <div
                            className={`image-grid drag-zone ${isDraggingImages ? 'active' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingImages(true); }}
                            onDragLeave={() => setIsDraggingImages(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingImages(false);
                                handleImageUpload({ target: { files: e.dataTransfer.files } });
                            }}
                        >
                            {formData.images && formData.images.map((img, index) => (
                                <div key={index} className="image-grid-item">
                                    <img src={img} alt={`Product ${index + 1}`} className="image-grid-img" />
                                    <button type="button" className="image-remove-btn" onClick={() => removeImage(index)}>×</button>
                                </div>
                            ))}
                            <button type="button" className="image-add-btn" onClick={() => editImageInputRef.current?.click()}>+</button>
                        </div>
                        <input ref={editImageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                        <p className="text-gray text-sm">Upload JPG, PNG, GIF, or WebP (max 5MB each)</p>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Quantity *</label>
                        <input type="number" className="form-input" required min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Minimum Stock Level *</label>
                        <input type="number" className="form-input" required min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Price (USD) *</label>
                        <input type="number" className="form-input" required min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                    </div>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                        <button type="submit" className="btn btn-info" style={{ flex: '1 1 0px' }}>💾 Save Changes</button>
                    </div>
                    <button type="button" onClick={() => onDelete(item.id)} className="btn btn-danger w-full mt-1">🗑️ Remove Item</button>
                </form>
            </div>
        </div>
    );
}

function AddItemModal({ onClose, onAdd, categories, onAlert }) {
    const [formData, setFormData] = useState({ name: '', category: categories[0] || 'Busbars', quantity: '', minStock: '', price: '', supplier: '', location: 'Warehouse A', images: [] });
    const [isDraggingImages, setIsDraggingImages] = useState(false);
    const addImageInputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        const newItem = { name: formData.name, category: formData.category, quantity: parseInt(formData.quantity) || 0, minStock: parseInt(formData.minStock) || 0, price: parseFloat(formData.price) || 0, supplier: formData.supplier, location: formData.location, images: formData.images || [] };
        onAdd(newItem);
    };

    const handleImageUpload = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files);
        const maxSize = 5 * 1024 * 1024;
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        for (const file of fileArray) {
            if (!allowedTypes.includes(file.type)) { onAlert && onAlert(`File ${file.name} is not a valid image type.`, 'error'); continue; }
            if (file.size > maxSize) { onAlert && onAlert(`File ${file.name} is too large. Max 5MB.`, 'warning'); continue; }

            try {
                const compressedData = await Utils.compressImage(file);
                setFormData(prev => ({ ...prev, images: [...(prev.images || []), compressedData] }));
            } catch (error) {
                console.error('Image processing error:', error);
                onAlert && onAlert(`Failed to process ${file.name}`, 'error');
            }
        }
    };

    const removeImage = (imageIndex) => { setFormData(prev => ({ ...prev, images: prev.images.filter((_, index) => index !== imageIndex) })); };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add New Item</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">📸 Product Images (Optional)</label>
                        <div
                            className={`image-grid image-grid-small drag-zone ${isDraggingImages ? 'active' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingImages(true); }}
                            onDragLeave={() => setIsDraggingImages(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDraggingImages(false);
                                handleImageUpload({ target: { files: e.dataTransfer.files } });
                            }}
                        >
                            {formData.images && formData.images.map((img, index) => (
                                <div key={index} className="image-grid-item">
                                    <img src={img} alt={`Product ${index + 1}`} className="image-grid-img image-grid-img-small" />
                                    <button type="button" className="image-remove-btn image-remove-btn-small" onClick={() => removeImage(index)}>×</button>
                                </div>
                            ))}
                            <button type="button" className="image-add-btn image-add-btn-small" onClick={() => addImageInputRef.current?.click()}>+</button>
                        </div>
                        <input ref={addImageInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageUpload} />
                    </div>
                    <input type="text" className="form-input" placeholder="Item Name *" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                        {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                    <input type="number" className="form-input" placeholder="Quantity *" required min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                    <input type="number" className="form-input" placeholder="Minimum Stock Level *" required min="0" value={formData.minStock} onChange={(e) => setFormData({ ...formData, minStock: e.target.value })} />
                    <input type="number" className="form-input" placeholder="Price (USD) *" required min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                    <input type="text" className="form-input" placeholder="Supplier *" required value={formData.supplier} onChange={(e) => setFormData({ ...formData, supplier: e.target.value })} />
                    <select className="form-select" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}>
                        <option>Warehouse A</option>
                        <option>Warehouse B</option>
                        <option>Warehouse C</option>
                    </select>
                    <div className="modal-buttons">
                        <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                        <button type="submit" className="btn btn-info" style={{ flex: '1 1 0px' }}>Add Item</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ImageGalleryModal({ item, onClose, onUpload, onDelete }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const fileInputRef = useRef(null);
    const hasImages = item.images && item.images.length > 0;
    const currentImage = hasImages ? item.images[selectedIndex] : null;

    return (
        <div className="gallery-overlay" onClick={onClose}>
            <div className="gallery-modal" onClick={(e) => e.stopPropagation()}>
                <div className="gallery-header">
                    <div>
                        <h2 className="gallery-title">📸 {item.name}</h2>
                        <p className="gallery-subtitle">{hasImages ? `${item.images.length} image${item.images.length !== 1 ? 's' : ''}` : 'No images'}</p>
                    </div>
                    <button className="gallery-close" onClick={onClose}>×</button>
                </div>
                {hasImages ? (
                    <>
                        <div className="gallery-main">
                            <img src={currentImage} alt={item.name} className="gallery-image" />
                            {item.images.length > 1 && (
                                <>
                                    <button className="gallery-nav prev" onClick={() => setSelectedIndex((selectedIndex - 1 + item.images.length) % item.images.length)}>‹</button>
                                    <button className="gallery-nav next" onClick={() => setSelectedIndex((selectedIndex + 1) % item.images.length)}>›</button>
                                    <div className="gallery-counter">{selectedIndex + 1} / {item.images.length}</div>
                                </>
                            )}
                            <button className="gallery-delete" onClick={() => onDelete(selectedIndex)}>🗑️ Delete</button>
                        </div>
                        {item.images.length > 1 && (
                            <div className="gallery-thumbnails">
                                {item.images.map((img, index) => (
                                    <img key={index} src={img} alt={`Thumbnail ${index + 1}`} onClick={() => setSelectedIndex(index)} className={`gallery-thumb ${selectedIndex === index ? 'active' : ''}`} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="gallery-empty">
                        <div className="gallery-empty-icon">📦</div>
                        <p className="gallery-empty-text">No images for this item yet</p>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => onUpload(e.target.files)} />
                <div className="gallery-actions">
                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-info" style={{ flex: '1 1 0px' }}>📤 Upload Images</button>
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Close</button>
                </div>
            </div>
        </div>
    );
}

function BackupRestoreModal({ onClose, onExport, onImport, inventory, stockMovements, purchaseOrders, categories }) {
    const [activeTab, setActiveTab] = useState('backup');
    const [importMode, setImportMode] = useState('replace');
    const [fileContent, setFileContent] = useState(null);
    const [fileName, setFileName] = useState('');
    const fileInputRef = useRef(null);
    const { addAlert } = useAlert();

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.json')) {
            addAlert('Please select a JSON backup file', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setFileContent(event.target.result);
            setFileName(file.name);
        };
        reader.readAsText(file);
    };

    const handleImport = () => {
        if (!fileContent) {
            addAlert('Please select a backup file first', 'warning');
            return;
        }

        const result = onImport(fileContent, importMode === 'merge');
        if (result.success) {
            onClose();
        }
    };

    const handleExport = () => {
        onExport();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">💾 Backup & Restore</h2>

                <div className="flex gap-2 mb-3">
                    <button
                        className={`btn ${activeTab === 'backup' ? 'btn-info' : ''}`}
                        onClick={() => setActiveTab('backup')}
                        style={{ flex: 1, background: activeTab === 'backup' ? '' : '#f3f4f6', color: activeTab === 'backup' ? '' : '#374151' }}
                    >
                        📥 Create Backup
                    </button>
                    <button
                        className={`btn ${activeTab === 'restore' ? 'btn-info' : ''}`}
                        onClick={() => setActiveTab('restore')}
                        style={{ flex: 1, background: activeTab === 'restore' ? '' : '#f3f4f6', color: activeTab === 'restore' ? '' : '#374151' }}
                    >
                        📤 Restore Backup
                    </button>
                </div>

                {activeTab === 'backup' && (
                    <div>
                        <div className="info-box mb-3">
                            <strong className="info-box-title">📋 What gets backed up?</strong>
                            <div className="info-box-content" style={{ marginTop: '8px' }}>
                                ✓ All inventory items ({inventory.length} items)<br />
                                ✓ Stock movement history<br />
                                ✓ Purchase orders<br />
                                ✓ Activity log<br />
                                ✓ Custom categories<br />
                                ✓ Settings (dark mode)
                            </div>
                        </div>

                        <div className="adjustment-preview mb-3">
                            <div className="adjustment-row">
                                <span>Inventory Items:</span>
                                <strong>{inventory.length}</strong>
                            </div>
                            <div className="adjustment-row">
                                <span>Stock Movements:</span>
                                <strong>{stockMovements.length}</strong>
                            </div>
                            <div className="adjustment-row">
                                <span>Purchase Orders:</span>
                                <strong>{purchaseOrders.length}</strong>
                            </div>
                            <div className="adjustment-row">
                                <span>Categories:</span>
                                <strong>{categories.length - 1}</strong>
                            </div>
                        </div>

                        <button onClick={handleExport} className="btn btn-primary w-full">
                            💾 Download Full Backup
                        </button>
                    </div>
                )}

                {activeTab === 'restore' && (
                    <div>
                        <div className="info-box mb-3" style={{ background: '#fef3c7', borderLeftColor: '#f59e0b' }}>
                            <strong className="info-box-title" style={{ color: '#92400e' }}>⚠️ Warning</strong>
                            <div className="info-box-content" style={{ marginTop: '8px', color: '#92400e' }}>
                                Restoring will overwrite your current data. Make sure to export a backup first!
                            </div>
                        </div>

                        <div className="form-group mb-3">
                            <label className="form-label">Import Mode</label>
                            <div className="flex gap-2">
                                <label className="checkbox-label" style={{ flex: 1, padding: '10px', background: importMode === 'replace' ? '#dbeafe' : '#f3f4f6', borderRadius: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="replace"
                                        checked={importMode === 'replace'}
                                        onChange={(e) => setImportMode(e.target.value)}
                                    />
                                    <span><strong>Replace All</strong><br /><small className="text-gray">Overwrite everything</small></span>
                                </label>
                                <label className="checkbox-label" style={{ flex: 1, padding: '10px', background: importMode === 'merge' ? '#dbeafe' : '#f3f4f6', borderRadius: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="radio"
                                        name="importMode"
                                        value="merge"
                                        checked={importMode === 'merge'}
                                        onChange={(e) => setImportMode(e.target.value)}
                                    />
                                    <span><strong>Merge</strong><br /><small className="text-gray">Add & update items</small></span>
                                </label>
                            </div>
                        </div>

                        <div className="form-group mb-3">
                            <label className="form-label">Select Backup File (.json)</label>
                            <div
                                className="drop-zone"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="drop-zone-icon">📁</div>
                                <div className="drop-zone-text">
                                    {fileName || 'Click to select backup file'}
                                </div>
                                <div className="drop-zone-subtext">
                                    Supports: barduct-backup-*.json
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                        </div>

                        {fileContent && (
                            <div className="adjustment-preview mb-3">
                                <div className="adjustment-row">
                                    <span>File:</span>
                                    <strong className="text-sm">{fileName}</strong>
                                </div>
                            </div>
                        )}

                        <div className="modal-buttons">
                            <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!fileContent}
                                className="btn btn-primary"
                                style={{ flex: 1, opacity: !fileContent ? 0.5 : 1 }}
                            >
                                📤 Restore Backup
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function AuditLogView({ activities }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [expandedIds, setExpandedIds] = useState(new Set());

    const toggleExpand = (id) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) newExpanded.delete(id); else newExpanded.add(id);
        setExpandedIds(newExpanded);
    };

    const typeIcons = {
        CREATE: '➕',
        UPDATE: '📝',
        DELETE: '🗑️',
        STOCK: '📦',
        SYSTEM: '⚙️',
        IMPORT: '📥',
        EXPORT: '💾'
    };

    const typeColors = {
        CREATE: 'text-success',
        UPDATE: 'text-info',
        DELETE: 'text-danger',
        STOCK: 'text-warning',
        SYSTEM: 'text-gray',
        IMPORT: 'text-primary',
        EXPORT: 'text-primary'
    };

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = activity.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (activity.entityName && activity.entityName.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof activity.details === 'string' && activity.details.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = filterType === 'ALL' || activity.type === filterType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="fade-in">
            <div className="header-content mb-3">
                <div className="header-title-group">
                    <h2 className="header-title">📜 Audit Trail & Activity Log</h2>
                    <p className="header-subtitle">Track all system events and changes</p>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="audit-controls mb-3">
                <div className="filter-tabs">
                    {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'STOCK', 'SYSTEM', 'IMPORT'].map(type => (
                        <button
                            key={type}
                            className={`filter-tab ${filterType === type ? 'active' : ''}`}
                            onClick={() => setFilterType(type)}
                        >
                            {type === 'ALL' ? 'All Events' : type}
                        </button>
                    ))}
                </div>
            </div>

            <div className="audit-list">
                {filteredActivities.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📜</div>
                        <h3>No activities found</h3>
                        <p>Try adjusting your search or filters</p>
                    </div>
                ) : (
                    filteredActivities.map(activity => (
                        <div key={activity.id} className={`audit-item ${expandedIds.has(activity.id) ? 'expanded' : ''}`}>
                            <div className="audit-header" onClick={() => toggleExpand(activity.id)}>
                                <div className="audit-icon-wrapper">
                                    <span className="audit-icon">{activity.icon || typeIcons[activity.type] || '•'}</span>
                                </div>
                                <div className="audit-main">
                                    <div className="audit-message">
                                        <span className={`audit-type ${typeColors[activity.type] || 'text-gray'}`}>{activity.type}</span>
                                        {activity.message}
                                    </div>
                                    <div className="audit-meta">
                                        <span className="audit-user">👤 {activity.user || 'System'}</span>
                                        <span className="audit-time">{new Date(activity.timestamp).toLocaleString()}</span>
                                    </div>
                                </div>
                                {activity.details && (
                                    <button className="audit-expand-btn">
                                        {expandedIds.has(activity.id) ? '▼' : '▶'}
                                    </button>
                                )}
                            </div>
                            {expandedIds.has(activity.id) && activity.details && (
                                <div className="audit-details">
                                    {typeof activity.details === 'object' ? (
                                        <pre>{JSON.stringify(activity.details, null, 2)}</pre>
                                    ) : (
                                        <div className="audit-details-text">{activity.details}</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function PrintReportTemplate({ inventory, totalValue }) {
    const today = new Date().toLocaleDateString();

    return (
        <div className="print-only">
            <div className="print-report-header">
                <div className="print-logo">
                    <span className="print-logo-icon">⚡</span>
                    <span className="print-logo-text">Barduct Inventory Report</span>
                </div>
                <div className="print-date">Generated: {today}</div>
            </div>

            <div className="print-summary-grid">
                <div className="print-summary-card">
                    <div className="print-label">Total Inventory Value</div>
                    <div className="print-value">${totalValue.toLocaleString()}</div>
                </div>
                <div className="print-summary-card">
                    <div className="print-label">Total SKUs</div>
                    <div className="print-value">{inventory.length}</div>
                </div>

            </div>

            <h3 className="print-section-title">📦 Inventory Status Summary</h3>
            <table className="print-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Category</th>
                        <th>Supplier</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Value</th>
                    </tr>
                </thead>
                <tbody>
                    {inventory.sort((a, b) => b.quantity * b.price - a.quantity * a.price).map(item => (
                        <tr key={item.id}>
                            <td>{item.name}</td>
                            <td>{item.category}</td>
                            <td>{item.supplier}</td>
                            <td>{item.quantity}</td>
                            <td>${item.price.toLocaleString()}</td>
                            <td>${(item.quantity * item.price).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="print-footer">
                <p>Inventory Manager System - Confidential Internal Report</p>
                <p>Page 1 of 1</p>
            </div>
        </div>
    );
}

// ========== MODAL COMPONENTS ==========

function AttachmentViewerModal({ attachment, onClose }) {
    if (!attachment) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between align-center mb-4">
                    <h2 className="modal-title mb-0">📄 {attachment.name}</h2>
                    <button className="btn" onClick={onClose}>✕</button>
                </div>
                <div className="attachment-preview-container">
                    {attachment.type.includes('image') ? (
                        <img src={attachment.data} alt={attachment.name} style={{ width: '100%', borderRadius: '8px' }} />
                    ) : (
                        <div className="pdf-preview-placeholder">
                            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📄</div>
                            <p>Viewing PDF: <strong>{attachment.name}</strong></p>
                            <a href={attachment.data} download={attachment.name} className="btn btn-primary mt-3">⬇️ Download PDF to View</a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ImportCSVModal({
    onClose, csvImportMode, setCsvImportMode, isDragging, handleDragOver,
    handleDragLeave, handleDrop, fileInputRef, handleFileUpload, exportToCSV
}) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">📤 Import CSV File</h2>
                <p className="text-gray mb-2">Upload a CSV file with the following columns: name, category, quantity, minStock, price, supplier, location</p>

                <div className="form-group mb-3">
                    <label className="form-label">Import Mode</label>
                    <div className="flex gap-2">
                        <label className={`checkbox-label ${csvImportMode === 'append' ? 'selected' : ''}`} style={{ flex: 1 }}>
                            <input
                                type="radio"
                                name="csvImportMode"
                                value="append"
                                checked={csvImportMode === 'append'}
                                onChange={(e) => setCsvImportMode(e.target.value)}
                            />
                            <div>
                                <strong>Append</strong>
                                <small>Add as new items</small>
                            </div>
                        </label>
                        <label className={`checkbox-label ${csvImportMode === 'update' ? 'selected' : ''}`} style={{ flex: 1 }}>
                            <input
                                type="radio"
                                name="csvImportMode"
                                value="update"
                                checked={csvImportMode === 'update'}
                                onChange={(e) => setCsvImportMode(e.target.value)}
                            />
                            <div>
                                <strong>Update/Add</strong>
                                <small>Update existing or add new</small>
                            </div>
                        </label>
                    </div>
                </div>

                <div className={`drop-zone ${isDragging ? 'active' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                    <div className="drop-zone-icon">📁</div>
                    <div className="drop-zone-text">{isDragging ? 'Drop file here...' : 'Drag & drop CSV file or click to browse'}</div>
                    <div className="drop-zone-subtext">Supported format: .csv</div>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFileUpload(e.target.files[0])} />
                <div className="info-box">
                    <strong className="info-box-title">📋 Sample CSV Format:</strong>
                    <pre className="info-box-content">{`name,category,quantity,minStock,price,supplier,location
Copper Busbar,Busbars,100,50,85,Andeli,Warehouse A
Circuit Breaker,Components,200,100,45,WEG,Warehouse B`}</pre>
                </div>
                <div className="modal-buttons">
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: '1 1 0px' }}>Cancel</button>
                    <button onClick={exportToCSV} className="btn btn-purple" style={{ flex: '1 1 0px' }}>📥 Download Sample CSV</button>
                </div>
            </div>
        </div>
    );
}

// ========== VIEW COMPONENTS ==========

function DashboardView({
    inventory, lowStockItems, totalValue, activities, categories,
    setShowAddModal, setShowPOModal, setShowImportModal, setShowBackupModal,
    exportToCSV, resetToDefault, clearAllData
}) {
    return (
        <div className="dashboard-grid">
            <div className="card card-full-width gradient-purple">
                <div className="quick-actions-header">
                    <h3 className="card-title">⚡ Quick Actions</h3>
                    <div className="auto-save">
                        <span className="auto-save-dot"></span>
                        Data auto-saved to browser
                    </div>
                </div>
                <div className="quick-actions-container">
                    <div className="quick-actions-group">
                        <div className="group-label">Inventory Operations</div>
                        <button className="quick-action-btn-compact" onClick={() => setShowAddModal(true)}>➕ Add New Item</button>
                        <button className="quick-action-btn-compact" onClick={() => setShowPOModal(true)}>📋 Create Purchase Order</button>
                    </div>
                    <div className="quick-actions-group">
                        <div className="group-label">Data Management</div>
                        <button className="quick-action-btn-compact" onClick={() => setShowImportModal(true)}>📤 Import from CSV</button>
                        <button className="quick-action-btn-compact" onClick={exportToCSV}>📥 Export to CSV</button>
                        <button className="quick-action-btn-compact" onClick={() => setShowBackupModal(true)}>💾 Backup / Restore</button>
                    </div>
                    <div className="quick-actions-group">
                        <div className="group-label">System</div>
                        <button className="quick-action-btn-compact" onClick={resetToDefault}>🔄 Reset to Sample Data</button>
                        <button className="quick-action-btn-compact danger-alt" onClick={clearAllData}>🗑️ Wipe All Data</button>
                    </div>
                </div>
            </div>

            <div className="card stat-card gradient-blue">
                <div className="stat-icon">📦</div>
                <div>
                    <div className="stat-value">{inventory.length}</div>
                    <div className="stat-label">Total Items</div>
                </div>
            </div>

            <div className="card stat-card gradient-pink">
                <div className="stat-icon">⚠️</div>
                <div>
                    <div className="stat-value">{lowStockItems.length}</div>
                    <div className="stat-label">Low Stock Alerts</div>
                </div>
            </div>

            <div className="card stat-card gradient-cyan">
                <div className="stat-icon">💰</div>
                <div>
                    <div className="stat-value">${totalValue.toLocaleString()}</div>
                    <div className="stat-label">Total Inventory Value</div>
                </div>
            </div>

            <div className="card stat-card gradient-green">
                <div className="stat-icon">🏭</div>
                <div>
                    <div className="stat-value">{categories.length - 1}</div>
                    <div className="stat-label">Categories</div>
                </div>
            </div>

            {lowStockItems.length > 0 && (
                <div className="card card-full-width">
                    <div className="alert-header">
                        <h3 className="card-title alert-title">⚠️ Low Stock Alerts</h3>
                        <button className="btn btn-secondary btn-sm" onClick={() => setShowPOModal(true)}>📋 Generate PO for Low Stock</button>
                    </div>
                    <div className="alert-list">
                        {lowStockItems.map(item => (
                            <div key={item.id} className="alert-item">
                                <div>
                                    <strong>{item.name}</strong>
                                    <span className="alert-badge">{item.category}</span>
                                </div>
                                <div className="alert-quantity">{item.quantity} / {item.minStock} units</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="card card-full-width">
                <h3 className="card-title">📊 Recent Activity</h3>
                <div className="activity-list">
                    {activities.length === 0 ? (
                        <div className="text-center text-gray">No recent activity. Start managing your inventory!</div>
                    ) : (
                        activities.slice(0, 5).map(activity => {
                            const timeAgo = Utils.getTimeAgo(activity.timestamp);
                            const typeConfig = {
                                CREATE: { icon: '➕', color: '#10b981' },
                                UPDATE: { icon: '📝', color: '#3b82f6' },
                                DELETE: { icon: '🗑️', color: '#ef4444' },
                                STOCK: { icon: '📦', color: '#f59e0b' },
                                SYSTEM: { icon: '⚙️', color: '#6b7280' },
                                IMPORT: { icon: '📥', color: '#8b5cf6' },
                                EXPORT: { icon: '💾', color: '#14b8a6' }
                            };
                            const config = typeConfig[activity.type] || { icon: activity.icon || '•', color: '#6b7280' };
                            return (
                                <div key={activity.id} className="activity-item">
                                    <div className="activity-icon" style={{ background: config.color }}>{config.icon}</div>
                                    <div className="activity-message">{activity.message}</div>
                                    <div className="activity-time">{timeAgo}</div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function InventoryView({
    inventory, categories, searchTerm, setSearchTerm, filterCategory, setFilterCategory,
    filteredInventory,
    openImageGallery, openEditModal, setShowAddCategoryModal, setShowAddModal,
    setEditingItem, setShowStockAdjustModal,
    setHistoryItem, setShowMovementHistoryModal
}) {
    return (
        <div>
            <div className="inventory-header">
                <div className="search-bar">
                    <input type="text" className="search-input" placeholder="🔍 Search inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                </div>
                <div className="flex gap-1">
                    <button className="btn btn-secondary" onClick={() => setShowAddCategoryModal(true)}>🏷️ Add Category</button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>➕ Add New Item</button>
                </div>
            </div>


            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Item Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Min Stock</th>
                            <th>Price</th>
                            <th>Supplier</th>
                            <th>Location</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInventory.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <div className="thumbnail-container" onClick={() => openImageGallery(item)}>
                                        {item.images && item.images.length > 0 ? (
                                            <div style={{ position: 'relative' }}>
                                                <img src={item.images[0]} alt={item.name} className="thumbnail" />
                                                {item.images.length > 1 && (<div className="image-count">+{item.images.length - 1}</div>)}
                                            </div>
                                        ) : (<div className="no-image">📦</div>)}
                                    </div>
                                </td>
                                <td>{item.name}</td>
                                <td><span className="badge badge-category">{item.category}</span></td>
                                <td><span className={`badge-quantity ${item.quantity <= item.minStock ? 'low' : 'good'}`}>{item.quantity}</span></td>
                                <td>{item.minStock}</td>
                                <td>${item.price}</td>
                                <td>{item.supplier}</td>
                                <td>{item.location}</td>
                                <td>
                                    <div className="flex gap-1">
                                        <button className="action-btn action-btn-blue" onClick={() => openEditModal(item)}>✏️ Edit</button>
                                        <button className="action-btn action-btn-orange" onClick={() => { setEditingItem(item); setShowStockAdjustModal(true); }}>📊 Adjust</button>
                                        <button className="action-btn action-btn-purple" onClick={() => { setHistoryItem(item); setShowMovementHistoryModal(true); }}>📜 History</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AnalyticsView({ inventory, stockMovements, chartRef, generatePDFReport }) {
    return (
        <div className="analytics-grid">
            <div className="card card-full-width">
                <div className="flex justify-between align-center mb-4">
                    <h3 className="card-title mb-0">📊 Inventory Distribution by Category</h3>
                    <button className="btn btn-export-pdf" onClick={generatePDFReport}>📄 Export PDF Report</button>
                </div>
                <div style={{ height: '300px', padding: '20px' }}>
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
            <TopValueItems inventory={inventory} />
            <WarehouseDistribution inventory={inventory} />
            <TopSuppliers inventory={inventory} />
        </div>
    );
}

function CatalogView({ inventory, categories, searchTerm, setSearchTerm, filterCategory, setFilterCategory, filteredInventory, openImageGallery, openEditModal }) {
    return (
        <div>
            <div className="inventory-header">
                <div className="search-bar">
                    <input type="text" className="search-input" placeholder="🔍 Search catalog..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    <select className="filter-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                        {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                    </select>
                </div>
            </div>

            <div className="catalog-grid">
                {filteredInventory.map(item => (
                    <div key={item.id} className="catalog-card">
                        <div className="catalog-image-container" onClick={() => openImageGallery(item)}>
                            {item.images && item.images.length > 0 ? (
                                <>
                                    <img src={item.images[0]} alt={item.name} className="catalog-image" />
                                    {item.images.length > 1 && (<div className="catalog-image-count">📸 {item.images.length}</div>)}
                                </>
                            ) : (
                                <div className="catalog-no-image">
                                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📦</div>
                                    <div className="text-gray text-sm">No image</div>
                                </div>
                            )}
                        </div>
                        <div className="catalog-content">
                            <h4 className="catalog-title">{item.name}</h4>
                            <span className="badge badge-category">{item.category}</span>
                            <div className="catalog-details">
                                <div className="catalog-detail-row">
                                    <span className="catalog-detail-label">Stock:</span>
                                    <span className={`catalog-detail-value ${item.quantity <= item.minStock ? 'low' : 'good'}`}>{item.quantity} units</span>
                                </div>
                                <div className="catalog-detail-row">
                                    <span className="catalog-detail-label">Price:</span>
                                    <span className="catalog-detail-value price">${item.price}</span>
                                </div>
                                <div className="catalog-detail-row">
                                    <span className="catalog-detail-label">Supplier:</span>
                                    <span className="text-gray text-sm">{item.supplier}</span>
                                </div>
                                <div className="catalog-detail-row">
                                    <span className="catalog-detail-label">Location:</span>
                                    <span className="text-gray text-sm">{item.location}</span>
                                </div>
                            </div>
                            <button className="catalog-edit-btn" onClick={() => openEditModal(item)}>✏️ Edit Item</button>
                        </div>
                    </div>
                ))}
            </div>

            {filteredInventory.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🔍</div>
                    <h3 className="empty-state-title">No items found</h3>
                    <p className="empty-state-text">Try adjusting your search or filter criteria</p>
                </div>
            )}
        </div>
    );
}

function OperationsView({ stockMovements, purchaseOrders, setShowPOModal, exportPOToCSV, setViewingAttachment, getMovementBadgeClass }) {
    return (
        <div className="analytics-grid">
            <div className="card card-full-width">
                <h3 className="card-title">📊 Recent Stock Movements</h3>
                <div className="max-h-400 overflow-auto">
                    {stockMovements.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">📊</div>
                            <p className="empty-state-text">No stock movements recorded yet.</p>
                            <p className="text-gray text-sm mt-1">Stock movements are tracked automatically when you add, edit, or adjust items.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Item</th>
                                    <th>Type</th>
                                    <th className="text-center">Qty</th>
                                    <th className="text-center">From → To</th>
                                    <th>Reason</th>
                                    <th>User</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockMovements.slice(0, 50).map(movement => (
                                    <tr key={movement.id}>
                                        <td className="text-sm">{Utils.getTimeAgo(movement.timestamp)}</td>
                                        <td className="font-bold">{movement.itemName}</td>
                                        <td><span className={`badge-status ${getMovementBadgeClass(movement.type)}`}>{movement.type}</span></td>
                                        <td className="text-center font-bold">{movement.quantity}</td>
                                        <td className="text-center text-gray text-sm">{movement.previousQty} → {movement.newQty}</td>
                                        <td className="text-sm">{movement.reason}</td>
                                        <td className="text-sm text-gray">{movement.user}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="card card-full-width">
                <div className="alert-header">
                    <h3 className="card-title alert-title">📋 Purchase Orders</h3>
                    <button className="btn btn-primary" onClick={() => setShowPOModal(true)}>➕ Create New PO</button>
                </div>

                {purchaseOrders.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📋</div>
                        <p className="empty-state-text">No purchase orders created yet.</p>
                        <p className="text-gray text-sm mt-1">Generate purchase orders when stock is running low.</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {purchaseOrders.map(po => (
                            <div key={po.id} className="po-card">
                                <div className="po-header">
                                    <div>
                                        <span className="po-id">{po.id}</span>
                                        <span className="po-date">{new Date(po.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="po-actions">
                                        <span className={`badge-status ${po.status === 'DRAFT' ? 'draft' : 'confirmed'}`}>{po.status}</span>
                                        <button className="btn btn-info btn-sm" onClick={() => exportPOToCSV(po)}>📥 Export</button>
                                    </div>
                                </div>
                                <div className="po-supplier">
                                    <span className="po-supplier-label">Supplier:</span>
                                    <span className="po-supplier-value">{po.supplier}</span>
                                </div>
                                <div className="po-items">
                                    <div className="po-items-label">Items ({po.items.length}):</div>
                                    <div className="po-item-list">
                                        {po.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="po-item">
                                                <span>{item.name}</span>
                                                <span className="text-gray">Order {item.orderQty} @ ${item.unitPrice}</span>
                                            </div>
                                        ))}
                                        {po.items.length > 3 && <div className="po-item-more">+ {po.items.length - 3} more items</div>}
                                    </div>
                                </div>
                                <div className="po-footer">
                                    <span className="po-total">Total: ${po.totalAmount.toLocaleString()}</span>
                                    {po.attachments && po.attachments.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {po.attachments.map((att, idx) => (
                                                <button key={idx} className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); setViewingAttachment(att); }}>
                                                    {att.type.includes('image') ? '🖼️' : '📄'} {att.name.slice(0, 10)}...
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {po.notes && <span className="po-notes">Notes: {po.notes}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

ReactDOM.render(<InventoryApp />, document.getElementById('root'));


// ========== DATA BACKUP & RECOVERY UTILITIES ==========

