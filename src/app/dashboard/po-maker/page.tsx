"use client";

import { useState, useEffect, Suspense, useTransition, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  getPOBySlipId, 
  savePO, 
  getApprovedProcurementsByAdhatiya, 
  getAdhatiyas, 
  saveAdhatiya, 
  deleteAdhatiya,
  getCompanyAddresses,
  saveCompanyAddress,
  deleteCompanyAddress,
  getWarehouseAddresses,
  saveWarehouseAddress,
  deleteWarehouseAddress
} from "@/app/actions/po";
import { 
  FileText, Search, Plus, Trash2, Save, Printer, Loader2, Users, PlusCircle, Building, Settings, Check, HelpCircle, ChevronDown, ChevronRight, MapPin, Truck, Receipt, Sprout, Home, AlertTriangle, Edit, Download
} from "lucide-react";
import { useToast } from "@/components/Toast";
import { getMandis } from "@/app/actions/mandis";

// Utility to convert number to Indian Rupees words
function numberToWords(num: number): string {
  if (num === 0) return "Zero Only";
  
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const formatThousands = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + formatThousands(n % 100) : '');
    return '';
  };

  let word = '';
  
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = Math.floor(num);

  if (crore > 0) {
    word += formatThousands(crore) + ' Crore ';
  }
  if (lakh > 0) {
    word += formatThousands(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    word += formatThousands(thousand) + ' Thousand ';
  }
  if (remaining > 0) {
    word += formatThousands(remaining);
  }

  // Handle decimal paise if any
  const paise = Math.round((num - remaining) * 100);
  let paiseWord = '';
  if (paise > 0) {
    paiseWord = ' and ' + formatThousands(paise) + ' Paise';
  }

  return word.trim() + paiseWord + " Rupees Only";
}

function POMakerForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();
  const initialSlipId = searchParams.get("slipId") || "";

  // UI States
  const [activeTab, setActiveTab] = useState<"adhatiya" | "billing" | "details" | "calculations">("adhatiya");
  const [openAddressSection, setOpenAddressSection] = useState<"vendor" | "billing" | "delivery" | null>("vendor");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search States
  const [slipIdInput, setSlipIdInput] = useState(initialSlipId);
  const [adhatiyaSearch, setAdhatiyaSearch] = useState("");
  const [dbAdhatiyas, setDbAdhatiyas] = useState<any[]>([]);
  const [selectedAdhatiyaId, setSelectedAdhatiyaId] = useState<number | null>(null);
  const [showAdhatiyaDropdown, setShowAdhatiyaDropdown] = useState(false);
  const [loadingAdhatiyas, setLoadingAdhatiyas] = useState(false);
  const [showSlipsDropdown, setShowSlipsDropdown] = useState(false);
  const [slipFilter, setSlipFilter] = useState("");

  // Adhatiya CRUD Modal State
  const [showCrudModal, setShowCrudModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [crudName, setCrudName] = useState("");
  const [crudAddress, setCrudAddress] = useState("");
  const [crudGst, setCrudGst] = useState("");
  const [crudMobile, setCrudMobile] = useState("");
  const [crudEmail, setCrudEmail] = useState("");
  const [editingAdhatiyaId, setEditingAdhatiyaId] = useState<number | null>(null);

  // Delete confirmation state variables
  const [adhatiyaToDelete, setAdhatiyaToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteStep, setDeleteStep] = useState<number>(0); // 0 = closed, 1 = warning, 2 = captcha, 3 = final
  const [captchaCode, setCaptchaCode] = useState<string>("");
  const [captchaInput, setCaptchaInput] = useState<string>("");

  // Cascading location states for Adhatiya CRUD
  const [mandisData, setMandisData] = useState<{state: string; district: string; mandiName: string}[]>([]);
  const [crudVillage, setCrudVillage] = useState("");
  const [crudBlock, setCrudBlock] = useState("");
  const [crudPinCode, setCrudPinCode] = useState("");
  const [crudState, setCrudState] = useState("");
  const [crudDistrict, setCrudDistrict] = useState("");
  const [crudMandi, setCrudMandi] = useState("");

  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");

  const [showMandiDropdown, setShowMandiDropdown] = useState(false);
  const [mandiSearch, setMandiSearch] = useState("");

  // Load mandis data on demand when Add modal is active
  useEffect(() => {
    if (showAddModal && mandisData.length === 0) {
      getMandis().then(setMandisData).catch(console.error);
    }
  }, [showAddModal, mandisData.length]);

  // Click outside and sync search input with selected location values
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.combobox-state')) setShowStateDropdown(false);
      if (!target.closest('.combobox-district')) setShowDistrictDropdown(false);
      if (!target.closest('.combobox-mandi')) setShowMandiDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!showStateDropdown) setStateSearch(crudState);
  }, [showStateDropdown, crudState]);

  useEffect(() => {
    if (!showDistrictDropdown) setDistrictSearch(crudDistrict);
  }, [showDistrictDropdown, crudDistrict]);

  useEffect(() => {
    if (!showMandiDropdown) setMandiSearch(crudMandi);
  }, [showMandiDropdown, crudMandi]);

  // Location data filtering
  const availableStates = useMemo(() => {
    return Array.from(new Set((mandisData || []).map(m => m.state).filter(Boolean))).sort();
  }, [mandisData]);

  const availableDistricts = useMemo(() => {
    return Array.from(new Set((mandisData || []).filter(m => m.state === crudState).map(m => m.district).filter(Boolean))).sort();
  }, [mandisData, crudState]);

  const availableMandis = useMemo(() => {
    const list = (mandisData || []).filter(m => m.state === crudState && m.district === crudDistrict);
    const unique = Array.from(new Map(list.map(m => [m.mandiName, m])).values());
    return unique.sort((a, b) => a.mandiName.localeCompare(b.mandiName));
  }, [mandisData, crudState, crudDistrict]);

  const filteredStates = useMemo(() => {
    return availableStates.filter(s => (s || "").toLowerCase().includes((stateSearch || "").toLowerCase()));
  }, [availableStates, stateSearch]);

  const filteredDistricts = useMemo(() => {
    return availableDistricts.filter(d => (d || "").toLowerCase().includes((districtSearch || "").toLowerCase()));
  }, [availableDistricts, districtSearch]);

  const filteredMandis = useMemo(() => {
    return availableMandis.filter(m => (m.mandiName || "").toLowerCase().includes((mandiSearch || "").toLowerCase()));
  }, [availableMandis, mandiSearch]);

  // Slips/Procurements State
  const [procurementSlips, setProcurementSlips] = useState<any[]>([]);
  const [selectedSlipIds, setSelectedSlipIds] = useState<Set<string>>(new Set());
  const [originalProcurement, setOriginalProcurement] = useState<any>(null);
  const [poBags, setPoBags] = useState(0);
  const [slipOverrides, setSlipOverrides] = useState<Record<string, number>>({});
  const [slipDetailsOverrides, setSlipDetailsOverrides] = useState<Record<string, Record<string, any>>>({});
  const [editingSlipId, setEditingSlipId] = useState<string | null>(null);
  const [poStatus, setPoStatus] = useState("SAVED");
  const [confirmBilled, setConfirmBilled] = useState(false);

  // PO Document States
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const [paymentTerms, setPaymentTerms] = useState("-");
  const [deliveryTerms, setDeliveryTerms] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState(
    "THE INSTRUMENT CONTAINS ALL THE TERMS AND CONDITIONS WITH RESPECT TO PURCHASE OF THE MATERIAL OR SERVICES NAMED HEREIN.\nNO MODIFICATION OR AMENDMENT SHALL HAVE ANY FORCE OR EFFECT UNLESS CONFIRMED BY BUYERS IN WRITING."
  );
  const [authorizedSignatory, setAuthorizedSignatory] = useState("Farmer ERP Pvt Ltd");

  // Address Blocks
  const [vendor, setVendor] = useState({
    name: "",
    address: "",
    gstNo: "",
    mobile: "",
    email: "",
    isAdhatiya: false
  });
  
  const [billing, setBilling] = useState({
    name: "Farmer ERP Pvt Ltd",
    address: "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
    gstNo: "GSTIN: 24AAACF1234A1Z5",
    mobile: "Mobile: +91 98765 43210",
    email: "Email: contact@farmererp.com"
  });

  const [delivery, setDelivery] = useState({
    name: "Farmer ERP Pvt Ltd",
    address: "12, Krishi Bhawan Complex, Sector 4, Gandhinagar, Gujarat - 382010",
    gstNo: "GSTIN: 24AAACF1234A1Z5",
    mobile: "Mobile: +91 98765 43210",
    email: "Email: contact@farmererp.com"
  });

  // Company & Warehouse Address management states
  const [billingOption, setBillingOption] = useState<"company" | "custom">("company");
  const [deliveryOption, setDeliveryOption] = useState<"warehouse" | "custom">("warehouse");
  
  const [companyAddresses, setCompanyAddresses] = useState<any[]>([]);
  const [selectedCompanyAddressId, setSelectedCompanyAddressId] = useState<number | null>(null);
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const [warehouseAddresses, setWarehouseAddresses] = useState<any[]>([]);
  const [selectedWarehouseAddressId, setSelectedWarehouseAddressId] = useState<number | null>(null);
  const [warehouseSearch, setWarehouseSearch] = useState("");
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // CRUD modals for Company & Warehouse addresses
  const [showCompanyCrudModal, setShowCompanyCrudModal] = useState(false);
  const [showWarehouseCrudModal, setShowWarehouseCrudModal] = useState(false);
  const [showCompanyAddModal, setShowCompanyAddModal] = useState(false);
  const [showWarehouseAddModal, setShowWarehouseAddModal] = useState(false);
  
  const [editingCompanyAddressId, setEditingCompanyAddressId] = useState<number | null>(null);
  const [editingWarehouseAddressId, setEditingWarehouseAddressId] = useState<number | null>(null);

  // Form states for adding/editing Company & Warehouse address
  const [addrName, setAddrName] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrVillage, setAddrVillage] = useState("");
  const [addrBlock, setAddrBlock] = useState("");
  const [addrPinCode, setAddrPinCode] = useState("");
  const [addrState, setAddrState] = useState("");
  const [addrDistrict, setAddrDistrict] = useState("");
  const [addrPlace, setAddrPlace] = useState("");
  const [addrGstNo, setAddrGstNo] = useState("");
  const [addrMobile, setAddrMobile] = useState("");
  const [addrEmail, setAddrEmail] = useState("");

  // Deletion warnings states for Company & Warehouse Address
  const [companyToDelete, setCompanyToDelete] = useState<any>(null);
  const [companyDeleteStep, setCompanyDeleteStep] = useState(0);
  const [companyCaptchaCode, setCompanyCaptchaCode] = useState("");
  const [companyCaptchaInput, setCompanyCaptchaInput] = useState("");

  const [warehouseToDelete, setWarehouseToDelete] = useState<any>(null);
  const [warehouseDeleteStep, setWarehouseDeleteStep] = useState(0);
  const [warehouseCaptchaCode, setWarehouseCaptchaCode] = useState("");
  const [warehouseCaptchaInput, setWarehouseCaptchaInput] = useState("");

  // Table parameters override
  const [hsnCode, setHsnCode] = useState("1063020");
  const [packingSize, setPackingSize] = useState(50);
  const [gstPercent, setGstPercent] = useState(0);
  const [manualNetQty, setManualNetQty] = useState<number | "">("");
  const [manualRate, setManualRate] = useState<number | "">("");
  const [manualCrop, setManualCrop] = useState("");
  const [manualVariety, setManualVariety] = useState("");

  // Taxes & Expenses Rates
  const [rates, setRates] = useState({
    mandiTaxPercent: 1.20,
    hammaliRate: 18.00,
    commissionPercent: 1.50,
    sutliRate: 1.00,
    otherExpenses: 300.00,
    bonusRate: 100.00,
    freightRate: 50.00
  });

  // Manual overrides for tax/expenses amounts
  const [overrides, setOverrides] = useState<Record<string, number | "">>({
    mandiTax: "",
    hammali: "",
    commission: "",
    sutli: "",
    otherExpenses: "",
    bonus: "",
    freight: "",
    roundOff: "",
    finalAmount: ""
  });

  const getSlipValue = (slip: any, field: string) => {
    const o = slipDetailsOverrides[slip.slipId] || {};
    if (o[field] !== undefined) return o[field];
    if (field === "bags") return slip.remainingBags !== undefined ? slip.remainingBags : slip.bags;
    if (field === "netQuantity") return slip.remainingQty !== undefined ? slip.remainingQty : slip.netQuantity;
    return slip[field] || "";
  };

  const updateSlipOverride = (slipId: string, field: string, value: any) => {
    setSlipDetailsOverrides(prev => {
      const existing = prev[slipId] || {};
      const next = { ...prev, [slipId]: { ...existing, [field]: value } };
      
      // Automatically recalculate total if netQuantity or rate changes
      if (field === "netQuantity" || field === "rate") {
        const q = field === "netQuantity" ? Number(value) : (existing.netQuantity !== undefined ? Number(existing.netQuantity) : 0);
        const r = field === "rate" ? Number(value) : (existing.rate !== undefined ? Number(existing.rate) : 0);
        next[slipId].total = Math.round((q * r) * 100) / 100;
      }
      return next;
    });
  };

  // Load initial slip if passed in URL
  useEffect(() => {
    if (initialSlipId) {
      fetchPO(initialSlipId);
    }
    loadAdhatiyas();
    loadCompanyAddresses();
    loadWarehouseAddresses();
  }, [initialSlipId]);

  // Load all Company Addresses
  const loadCompanyAddresses = async () => {
    setLoadingCompanies(true);
    try {
      const res = await getCompanyAddresses();
      setCompanyAddresses(res);
      // Auto-select the first one if none selected and option is company
      if (res.length > 0 && !selectedCompanyAddressId) {
        const matched = res.find(c => c.name === "Farmer ERP Pvt Ltd") || res[0];
        handleSelectCompanyAddress(matched);
      }
    } catch (e) {
      console.error("Failed to load Company Addresses:", e);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load all Warehouse Addresses
  const loadWarehouseAddresses = async () => {
    setLoadingWarehouses(true);
    try {
      const res = await getWarehouseAddresses();
      setWarehouseAddresses(res);
    } catch (e) {
      console.error("Failed to load Warehouse Addresses:", e);
    } finally {
      setLoadingWarehouses(false);
    }
  };

  const handleSelectCompanyAddress = (addr: any) => {
    setSelectedCompanyAddressId(addr.id);
    setCompanySearch(addr.name);
    setShowCompanyDropdown(false);

    const fullAddress = [
      addr.address,
      [addr.village, addr.block].filter(Boolean).join(", "),
      [addr.district, addr.place].filter(Boolean).join(", ") + (addr.pinCode ? ` - ${addr.pinCode}` : ""),
      addr.state ? `State: ${addr.state}` : ""
    ].filter(Boolean).join("\n");

    setBilling({
      name: addr.name,
      address: fullAddress,
      gstNo: addr.gstNo ? `GSTIN: ${addr.gstNo}` : "",
      mobile: addr.mobile ? `Mobile: ${addr.mobile}` : "",
      email: addr.email ? `Email: ${addr.email}` : ""
    });
  };

  const handleSelectWarehouseAddress = (addr: any) => {
    setSelectedWarehouseAddressId(addr.id);
    setWarehouseSearch(addr.name);
    setShowWarehouseDropdown(false);

    const fullAddress = [
      addr.address,
      [addr.village, addr.block].filter(Boolean).join(", "),
      [addr.district, addr.place].filter(Boolean).join(", ") + (addr.pinCode ? ` - ${addr.pinCode}` : ""),
      addr.state ? `State: ${addr.state}` : ""
    ].filter(Boolean).join("\n");

    setDelivery({
      name: addr.name,
      address: fullAddress,
      gstNo: addr.gstNo ? `GSTIN: ${addr.gstNo}` : "",
      mobile: addr.mobile ? `Mobile: ${addr.mobile}` : "",
      email: addr.email ? `Email: ${addr.email}` : ""
    });
  };

  const handleSaveCompanyAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName.trim()) return;

    try {
      await saveCompanyAddress({
        id: editingCompanyAddressId || undefined,
        name: addrName,
        address: addrStreet,
        village: addrVillage,
        block: addrBlock,
        pinCode: addrPinCode,
        state: addrState,
        district: addrDistrict,
        place: addrPlace,
        gstNo: addrGstNo,
        mobile: addrMobile,
        email: addrEmail
      });

      addToast({
        type: "success",
        title: editingCompanyAddressId ? "Address Updated" : "Address Created",
        message: `Successfully saved "${addrName}"`
      });

      // Reset states
      setAddrName("");
      setAddrStreet("");
      setAddrVillage("");
      setAddrBlock("");
      setAddrPinCode("");
      setAddrState("");
      setAddrDistrict("");
      setAddrPlace("");
      setAddrGstNo("");
      setAddrMobile("");
      setAddrEmail("");
      setEditingCompanyAddressId(null);
      setShowCompanyAddModal(false);
      loadCompanyAddresses();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Save Error",
        message: err.message || "Failed to save company address"
      });
    }
  };

  const handleDeleteCompanyAddress = (id: number, name: string) => {
    setCompanyToDelete({ id, name });
    setCompanyCaptchaCode(generateRandomCaptcha());
    setCompanyCaptchaInput("");
    setCompanyDeleteStep(1);
  };

  const handleDeleteCompanyConfirmed = async (id: number) => {
    try {
      await deleteCompanyAddress(id);
      addToast({
        type: "success",
        title: "Deleted",
        message: "Company Address removed from database"
      });
      loadCompanyAddresses();
      if (selectedCompanyAddressId === id) {
        setSelectedCompanyAddressId(null);
        setCompanySearch("");
        setBilling({ name: "", address: "", gstNo: "", mobile: "", email: "" });
      }
      setCompanyDeleteStep(0);
      setCompanyToDelete(null);
      setCompanyCaptchaInput("");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete Company Address"
      });
    }
  };

  const handleSaveWarehouseAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrName.trim()) return;

    try {
      await saveWarehouseAddress({
        id: editingWarehouseAddressId || undefined,
        name: addrName,
        address: addrStreet,
        village: addrVillage,
        block: addrBlock,
        pinCode: addrPinCode,
        state: addrState,
        district: addrDistrict,
        place: addrPlace,
        gstNo: addrGstNo,
        mobile: addrMobile,
        email: addrEmail
      });

      addToast({
        type: "success",
        title: editingWarehouseAddressId ? "Address Updated" : "Address Created",
        message: `Successfully saved "${addrName}"`
      });

      // Reset states
      setAddrName("");
      setAddrStreet("");
      setAddrVillage("");
      setAddrBlock("");
      setAddrPinCode("");
      setAddrState("");
      setAddrDistrict("");
      setAddrPlace("");
      setAddrGstNo("");
      setAddrMobile("");
      setAddrEmail("");
      setEditingWarehouseAddressId(null);
      setShowWarehouseAddModal(false);
      loadWarehouseAddresses();
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Save Error",
        message: err.message || "Failed to save warehouse address"
      });
    }
  };

  const handleDeleteWarehouseAddress = (id: number, name: string) => {
    setWarehouseToDelete({ id, name });
    setWarehouseCaptchaCode(generateRandomCaptcha());
    setWarehouseCaptchaInput("");
    setWarehouseDeleteStep(1);
  };

  const handleDeleteWarehouseConfirmed = async (id: number) => {
    try {
      await deleteWarehouseAddress(id);
      addToast({
        type: "success",
        title: "Deleted",
        message: "Warehouse Address removed from database"
      });
      loadWarehouseAddresses();
      if (selectedWarehouseAddressId === id) {
        setSelectedWarehouseAddressId(null);
        setWarehouseSearch("");
        setDelivery({ name: "", address: "", gstNo: "", mobile: "", email: "" });
      }
      setWarehouseDeleteStep(0);
      setWarehouseToDelete(null);
      setWarehouseCaptchaInput("");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete Warehouse Address"
      });
    }
  };

  // Load all Adhatiyas for search
  const loadAdhatiyas = async (query = "") => {
    setLoadingAdhatiyas(true);
    try {
      const res = await getAdhatiyas(query);
      setDbAdhatiyas(res);
    } catch (e: any) {
      console.error("Failed to load Adhatiyas:", e);
    } finally {
      setLoadingAdhatiyas(false);
    }
  };

  // Fetch PO by slip ID
  const fetchPO = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data: any = await getPOBySlipId(id);
      
      // Populate fields
      setPoNumber(data.poNumber || `PO-${id}`);
      
      if (data.procurement) {
        setOriginalProcurement(data.procurement);
        setPoBags(data.procurement.bags || 0);
        setManualRate(data.procurement.rate || "");
        setManualCrop(data.procurement.crop || "");
        setManualVariety(data.procurement.variety || "");
        setManualNetQty("");

        // Trigger loading of slips for this slip's Adhatiya
        if (data.procurement.adtiyaName) {
          setAdhatiyaSearch(data.procurement.adtiyaName);
          fetchSlipsForAdhatiya(data.procurement.adtiyaName, data.slipId);
        }
      }

      // Check if saved PO values exist
      try {
        const parsed = typeof data.items === 'string' ? JSON.parse(data.items) : data.items || {};
        if (parsed.vendor) setVendor(parsed.vendor);
        else {
          setVendor({
            name: data.supplierName || "",
            address: data.supplierLocation || "",
            gstNo: "",
            mobile: "",
            email: "",
            isAdhatiya: !!data.procurement?.adtiyaName
          });
        }

        if (parsed.billing) setBilling(parsed.billing);
        if (parsed.delivery) setDelivery(parsed.delivery);
        if (parsed.poDate) setPoDate(parsed.poDate);
        if (parsed.paymentTerms) setPaymentTerms(parsed.paymentTerms);
        if (parsed.deliveryTerms) setDeliveryTerms(parsed.deliveryTerms);
        if (parsed.termsAndConditions) setTermsAndConditions(parsed.termsAndConditions);
        if (parsed.authorizedSignatory) setAuthorizedSignatory(parsed.authorizedSignatory);

        if (parsed.overrides) {
          setHsnCode(parsed.overrides.hsnCode ?? "1063020");
          setPackingSize(parsed.overrides.packingSize ?? 50);
          setGstPercent(parsed.overrides.gstPercent ?? 0);
          setManualNetQty(parsed.overrides.manualNetQty ?? "");
          setManualRate(parsed.overrides.manualRate ?? "");
          setManualCrop(parsed.overrides.manualCrop ?? "");
          setManualVariety(parsed.overrides.manualVariety ?? "");
        }

        if (parsed.rates) setRates(parsed.rates);
        if (parsed.calcOverrides) setOverrides(parsed.calcOverrides);

        if (parsed.selectedProcurements?.length > 0) {
          const ids = new Set<string>(parsed.selectedProcurements.map((p: any) => p.slipId));
          setSelectedSlipIds(ids);
        } else {
          setSelectedSlipIds(new Set([id]));
        }
      } catch (err) {
        console.error("Error parsing saved items:", err);
      }

      if (data.status) {
        setPoStatus(data.status);
        setConfirmBilled(data.status === "BILLED");
      }

    } catch (error: any) {
      addToast({
        type: "error",
        title: "Error",
        message: error.message || "Failed to fetch procurement record"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved slips for Selected Adhatiya Name
  const fetchSlipsForAdhatiya = async (name: string, primarySlipId?: string) => {
    try {
      const res = await getApprovedProcurementsByAdhatiya(name);
      setProcurementSlips(res);
      
      // If we are loading an existing or new slip, make sure it is checked
      if (primarySlipId) {
        setSelectedSlipIds(prev => {
          const next = new Set(prev);
          next.add(primarySlipId);
          return next;
        });
      } else if (res.length > 0) {
        // By default select all of them
        setSelectedSlipIds(new Set(res.map(r => r.slipId)));
      } else {
        setSelectedSlipIds(new Set());
      }
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Slips Fetch Error",
        message: err.message || "Could not fetch procurements for this Adhatiya"
      });
    }
  };

  // Fetch DB Adhatiya detailed Address & update Vendor state
  const handleSelectAdhatiya = (adhatiya: any) => {
    setSelectedAdhatiyaId(adhatiya.id);
    setAdhatiyaSearch(adhatiya.name);
    setShowAdhatiyaDropdown(false);
    
    // Construct structured address block
    const fullAddress = [
      adhatiya.address,
      [adhatiya.village, adhatiya.block].filter(Boolean).join(", "),
      [adhatiya.district, adhatiya.state].filter(Boolean).join(", ") + (adhatiya.pinCode ? ` - ${adhatiya.pinCode}` : ""),
      adhatiya.mandi ? `Mandi: ${adhatiya.mandi}` : ""
    ].filter(Boolean).join("\n");

    // Fill Vendor Form Info
    setVendor({
      name: adhatiya.name,
      address: fullAddress,
      gstNo: adhatiya.gstNo,
      mobile: adhatiya.mobile,
      email: adhatiya.email,
      isAdhatiya: true
    });

    // Fetch slips for this Adhatiya
    fetchSlipsForAdhatiya(adhatiya.name);
    setShowSlipsDropdown(true);
  };

  // Save/Create Adhatiya Action
  const handleSaveAdhatiya = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crudName.trim()) return;

    if (!crudAddress.trim() || !crudVillage.trim() || !crudBlock.trim() || !crudState.trim() || !crudDistrict.trim() || !crudMandi.trim() || !crudGst.trim() || !crudMobile.trim()) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Please fill all required fields (*)."
      });
      return;
    }

    try {
      const saved = await saveAdhatiya({
        id: editingAdhatiyaId || undefined,
        name: crudName.trim(),
        address: crudAddress.trim(),
        village: crudVillage.trim(),
        block: crudBlock.trim(),
        pinCode: crudPinCode.trim(),
        state: crudState.trim(),
        district: crudDistrict.trim(),
        mandi: crudMandi.trim(),
        gstNo: crudGst.trim(),
        mobile: crudMobile.trim(),
        email: crudEmail.trim()
      });

      addToast({
        type: "success",
        title: "Success",
        message: `Adhatiya ${editingAdhatiyaId ? "updated" : "created"} successfully`
      });

      // Clear fields
      setCrudName("");
      setCrudAddress("");
      setCrudVillage("");
      setCrudBlock("");
      setCrudPinCode("");
      setCrudState("");
      setCrudDistrict("");
      setCrudMandi("");
      setStateSearch("");
      setDistrictSearch("");
      setMandiSearch("");
      setCrudGst("");
      setCrudMobile("");
      setCrudEmail("");
      setEditingAdhatiyaId(null);
      setShowAddModal(false);

      // Reload list and automatically select the saved one
      await loadAdhatiyas();
      handleSelectAdhatiya(saved);

    } catch (err: any) {
      addToast({
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save Adhatiya"
      });
    }
  };

  // Helper to generate 6-char verification code
  const generateRandomCaptcha = () => {
    const chars = "ABCDEFGHJKLMNOPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Trigger Delete flow modal
  const handleDeleteAdhatiya = (id: number, name: string) => {
    setAdhatiyaToDelete({ id, name });
    setDeleteStep(1);
  };

  // Confirm delete handler (final stage)
  const handleDeleteAdhatiyaConfirmed = async (id: number) => {
    try {
      await deleteAdhatiya(id);
      addToast({
        type: "success",
        title: "Deleted",
        message: "Adhatiya removed from database"
      });
      loadAdhatiyas();
      if (selectedAdhatiyaId === id) {
        setSelectedAdhatiyaId(null);
        setVendor({ name: "", address: "", gstNo: "", mobile: "", email: "", isAdhatiya: false });
      }
      setDeleteStep(0);
      setAdhatiyaToDelete(null);
      setCaptchaInput("");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Delete Failed",
        message: err.message || "Could not delete Adhatiya"
      });
      // Reset delete flow on failure
      setDeleteStep(0);
      setAdhatiyaToDelete(null);
      setCaptchaInput("");
    }
  };

  // Direct slip search handler
  const handleDirectSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (slipIdInput.trim()) {
      fetchPO(slipIdInput.trim());
      router.replace(`/dashboard/po-maker?slipId=${slipIdInput.trim()}`, { scroll: false });
    }
  };

  // Calculations logic
  const calcs = useMemo(() => {
    // 1. Gather all selected slips
    const selectedSlips = procurementSlips.filter(s => selectedSlipIds.has(s.slipId));
    
    // If no slips selected but we have a single primary loaded procurement, use it
    const activeSlips = selectedSlips.length > 0 
      ? selectedSlips.map(s => {
          const o = slipDetailsOverrides[s.slipId] || {};
          const crop = o.crop !== undefined ? o.crop : (s.crop || "");
          const variety = o.variety !== undefined ? o.variety : (s.variety || "");
          const bags = o.bags !== undefined ? o.bags : (s.remainingBags !== undefined ? s.remainingBags : s.bags || 0);
          const netQuantity = o.netQuantity !== undefined ? o.netQuantity : (s.remainingQty !== undefined ? s.remainingQty : s.netQuantity || 0);
          const rate = o.rate !== undefined ? o.rate : (s.rate || 0);
          const total = o.total !== undefined ? o.total : Math.round((netQuantity * rate) * 100) / 100;
          return { ...s, crop, variety, bags, netQuantity, rate, total };
        }) 
      : (originalProcurement ? [
          (() => {
            const o = slipDetailsOverrides[originalProcurement.slipId] || {};
            const crop = o.crop !== undefined ? o.crop : (manualCrop || originalProcurement.crop || "");
            const variety = o.variety !== undefined ? o.variety : (manualVariety || originalProcurement.variety || "");
            const bags = o.bags !== undefined ? o.bags : (poBags || originalProcurement.remainingBags || originalProcurement.bags || 0);
            const netQuantity = o.netQuantity !== undefined ? o.netQuantity : (manualNetQty !== "" ? Number(manualNetQty) : (originalProcurement.remainingQty !== undefined ? originalProcurement.remainingQty : originalProcurement.netQuantity || 0));
            const rate = o.rate !== undefined ? o.rate : (manualRate !== "" ? Number(manualRate) : (originalProcurement.rate || 0));
            const total = o.total !== undefined ? o.total : Math.round((netQuantity * rate) * 100) / 100;
            return { ...originalProcurement, crop, variety, bags, netQuantity, rate, total };
          })()
        ] : []);

    let totalBags = 0;
    let totalQty = 0;
    let totalSubtotal = 0;

    activeSlips.forEach(slip => {
      totalBags += slip.bags || 0;
      totalQty += slip.netQuantity || 0;
      totalSubtotal += slip.total || 0;
    });

    // Handle overrides for single-item PO or bags override
    if (activeSlips.length === 1 && originalProcurement) {
      if (poBags > 0) totalBags = poBags;
    } else {
      if (poBags > 0) totalBags = poBags;
    }

    // Auto-calculated taxes & additions
    const autoMandiTax = (rates.mandiTaxPercent / 100) * totalSubtotal;
    const autoHammali = rates.hammaliRate * totalBags;
    const autoCommission = (rates.commissionPercent / 100) * totalSubtotal;
    const autoSutli = rates.sutliRate * totalBags;
    const autoOtherExpenses = rates.otherExpenses;
    const autoBonus = rates.bonusRate * totalQty;
    const autoFreight = rates.freightRate * totalQty;

    // Apply Overrides if present
    const mandiTax = overrides.mandiTax !== "" ? Number(overrides.mandiTax) : autoMandiTax;
    const hammali = overrides.hammali !== "" ? Number(overrides.hammali) : autoHammali;
    const commission = overrides.commission !== "" ? Number(overrides.commission) : autoCommission;
    const sutli = overrides.sutli !== "" ? Number(overrides.sutli) : autoSutli;
    const otherExpenses = overrides.otherExpenses !== "" ? Number(overrides.otherExpenses) : autoOtherExpenses;
    const bonus = overrides.bonus !== "" ? Number(overrides.bonus) : autoBonus;
    const freight = overrides.freight !== "" ? Number(overrides.freight) : autoFreight;

    const rawFinal = totalSubtotal + mandiTax + hammali + commission + sutli + otherExpenses + bonus + freight;
    const autoRoundedFinal = Math.round(rawFinal);
    const autoRoundOff = autoRoundedFinal - rawFinal;

    const roundOff = overrides.roundOff !== "" ? Number(overrides.roundOff) : autoRoundOff;
    const finalAmount = overrides.finalAmount !== "" ? Number(overrides.finalAmount) : Math.round(rawFinal + roundOff);

    return {
      activeSlips,
      totalBags,
      totalQty,
      subtotal: totalSubtotal,
      mandiTax,
      hammali,
      commission,
      sutli,
      otherExpenses,
      bonus,
      freight,
      roundOff,
      finalAmount
    };
  }, [procurementSlips, selectedSlipIds, originalProcurement, poBags, manualNetQty, manualRate, manualCrop, manualVariety, rates, overrides, slipOverrides, slipDetailsOverrides]);

  // Handle Save PO to Database
  const handleSave = async () => {
    // We need at least one slip ID to tie this PO to in the database.
    let targetSlipId = initialSlipId;
    if (!targetSlipId && calcs.activeSlips.length > 0) {
      targetSlipId = calcs.activeSlips[0].slipId;
    }

    if (!targetSlipId) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Please select or search for at least one procurement slip to create a PO."
      });
      return;
    }

    setSaving(true);
    try {
      await savePO({
        slipId: targetSlipId,
        poNumber,
        companyName: billing.name,
        companyAddress: billing.address,
        supplierName: vendor.name,
        supplierLocation: vendor.address,
        paymentDuration: 10, // Legacy support, actual metadata in items JSON
        paymentDate: new Date(),
        status: confirmBilled ? "BILLED" : "SAVED",
        items: {
          vendor,
          billing,
          delivery,
          poDate,
          paymentTerms,
          deliveryTerms,
          termsAndConditions,
          authorizedSignatory,
          rates,
          calcOverrides: overrides,
          overrides: {
            hsnCode,
            packingSize,
            gstPercent,
            manualNetQty,
            manualRate,
            manualCrop,
            manualVariety
          },
          selectedProcurements: calcs.activeSlips.map((s: any) => ({
            slipId: s.slipId,
            farmerName: s.farmerName,
            farmerCode: s.farmerCode,
            bags: s.bags,
            netQuantity: s.netQuantity,
            rate: s.rate,
            total: s.total,
            crop: s.crop,
            variety: s.variety
          }))
        }
      });

      addToast({
        type: "success",
        title: "Success",
        message: "Purchase Order saved successfully"
      });
      router.push('/dashboard/po-records');
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Save Failed",
        message: err.message || "Failed to save PO"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const safePoNumber = poNumber.replace(/[\/\\]/g, '-') || 'PO';
    const safeSupplier = vendor.name.trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    document.title = `PO_${safeSupplier}_${safePoNumber}`;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };

  return (
    <div className="max-w-[100vw] mx-auto min-h-screen flex flex-col xl:flex-row pb-24 xl:pb-0 overflow-hidden print:overflow-visible print:h-auto print:block bg-[#f5f5f7]">
      
      {/* MOBILE PREVIEW/EDITOR TOGGLE */}
      {(calcs.activeSlips.length > 0 || originalProcurement) && (
        <div className="xl:hidden flex items-center p-1.5 bg-slate-200 m-4 rounded-xl print:hidden sticky top-4 z-40">
          <button 
            onClick={() => setMobileTab('edit')} 
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mobileTab === 'edit' ? 'bg-white shadow-sm text-forest-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Form Editor
          </button>
          <button 
            onClick={() => setMobileTab('preview')} 
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mobileTab === 'preview' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            A4 Live Preview
          </button>
        </div>
      )}

      {/* LEFT COLUMN: EDIT FORM */}
      <div className={`w-full xl:w-[45%] h-full xl:max-h-screen xl:overflow-y-auto p-4 md:p-6 space-y-6 border-r border-slate-200 print:hidden pb-32 xl:pb-6 bg-[#f5f5f7] ${mobileTab === 'preview' ? 'hidden xl:block' : 'block'}`}>
        
        {/* Header Title */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 bg-forest-100 rounded-xl flex items-center justify-center">
            <PlusCircle size={20} className="text-forest-700" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">PO Maker</h1>
            <p className="text-xs text-slate-500">Configure purchase order templates & addresses in one place</p>
          </div>
        </div>

        {/* Global Controls & Search Section */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-4">
          
          {/* Adhatiya Search Box */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              1. Add Vendor/Adhatiya From Database
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Adhatiya name..."
                  value={adhatiyaSearch}
                  onChange={(e) => {
                    setAdhatiyaSearch(e.target.value);
                    loadAdhatiyas(e.target.value);
                    setShowAdhatiyaDropdown(true);
                  }}
                  onFocus={() => setShowAdhatiyaDropdown(true)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all text-sm font-semibold text-slate-800"
                />
                
                {/* Search Dropdown */}
                {showAdhatiyaDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5">
                    {loadingAdhatiyas && (
                      <div className="p-3 text-xs text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Searching...</div>
                    )}
                    {!loadingAdhatiyas && dbAdhatiyas.length === 0 && (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        <p className="mb-2">No Adhatiya named &quot;{adhatiyaSearch}&quot;</p>
                        <button
                          type="button"
                          onClick={() => {
                            setCrudName(adhatiyaSearch);
                            setCrudAddress("");
                            setCrudGst("");
                            setCrudMobile("");
                            setCrudEmail("");
                            setEditingAdhatiyaId(null);
                            setShowAddModal(true);
                            setShowAdhatiyaDropdown(false);
                          }}
                          className="px-3 py-1.5 bg-forest-600 text-white text-[11px] font-bold rounded-lg hover:bg-forest-700"
                        >
                          + Add &quot;{adhatiyaSearch}&quot; as New Adhatiya
                        </button>
                      </div>
                    )}
                    {dbAdhatiyas.map((ad) => (
                      <div
                        key={ad.id}
                        onClick={() => handleSelectAdhatiya(ad)}
                        className="p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between items-center text-xs group"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{ad.name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{ad.address || "No Address"}</p>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono group-hover:bg-forest-50 group-hover:text-forest-700">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  loadAdhatiyas();
                  setShowCrudModal(true);
                }}
                className="px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 flex items-center gap-1.5"
                title="Manage Database"
              >
                <Settings size={14} />
                Manage
              </button>
            </div>
          </div>

          {/* Or search by Slip ID directly */}
          <div className="border-t border-slate-100 pt-3">
            <form onSubmit={handleDirectSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Or load by Slip ID directly (e.g. UP-26...)"
                  value={slipIdInput}
                  onChange={(e) => setSlipIdInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:outline-none focus:ring-2 focus:ring-forest-500/20 focus:border-forest-500 transition-all text-xs font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !slipIdInput.trim()}
                className="px-4 bg-slate-800 text-white rounded-xl hover:bg-slate-900 text-xs font-bold transition-all flex items-center gap-1"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : "Fetch"}
              </button>
            </form>
          </div>
        </div>

        {/* Adhatiya procurement slips list (Multi-Select Dropdown) */}
        {procurementSlips.length > 0 && (
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              2. Select Slips under &quot;{adhatiyaSearch}&quot;
            </label>
            <button
              type="button"
              onClick={() => setShowSlipsDropdown(!showSlipsDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <span>
                {selectedSlipIds.size === 0 
                  ? "Select Farmers/Traders (None Selected)" 
                  : `Selected ${selectedSlipIds.size} of ${procurementSlips.length} Slips`}
              </span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${showSlipsDropdown ? "rotate-180" : ""}`} />
            </button>

            {showSlipsDropdown && (
              <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-hidden flex flex-col p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Available Slips</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedSlipIds.size === procurementSlips.length) {
                        setSelectedSlipIds(new Set());
                      } else {
                        setSelectedSlipIds(new Set(procurementSlips.map(s => s.slipId)));
                      }
                    }}
                    className="text-[10px] font-bold text-forest-700 hover:text-forest-800 bg-forest-50 px-2 py-0.5 rounded"
                  >
                    {selectedSlipIds.size === procurementSlips.length ? "Clear All" : "Select All"}
                  </button>
                </div>
                
                {/* Search box to filter slips inside the dropdown */}
                <input
                  type="text"
                  placeholder="Filter slips by farmer name or code..."
                  value={slipFilter}
                  onChange={(e) => setSlipFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 transition-all font-semibold text-slate-700"
                />

                <div className="space-y-1.5 overflow-y-auto flex-1 max-h-52 pr-1">
                  {procurementSlips
                    .filter(s => 
                      s.farmerName?.toLowerCase().includes(slipFilter.toLowerCase()) || 
                      s.farmerCode?.toLowerCase().includes(slipFilter.toLowerCase()) ||
                      s.crop?.toLowerCase().includes(slipFilter.toLowerCase()) ||
                      s.slipId?.toLowerCase().includes(slipFilter.toLowerCase())
                    )
                    .map((slip) => {
                      const isChecked = selectedSlipIds.has(slip.slipId);
                      return (
                        <label
                          key={slip.slipId}
                          className={`flex items-start gap-3 p-2 border rounded-lg cursor-pointer hover:bg-slate-50 transition-all ${isChecked ? "border-forest-500 bg-forest-50/10" : "border-slate-100"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedSlipIds(prev => {
                                const next = new Set(prev);
                                if (next.has(slip.slipId)) next.delete(slip.slipId);
                                else next.add(slip.slipId);
                                return next;
                              });
                            }}
                            className="mt-0.5 w-3.5 h-3.5 accent-forest-700 shrink-0 rounded"
                          />
                          <div className="flex-1 min-w-0 text-[11px] leading-tight">
                            <p className="font-bold text-slate-800">
                              {slip.farmerName} <span className="text-[9px] font-normal text-slate-400">({slip.farmerCode})</span>
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {slip.crop} • {slip.bags} Bags • {slip.netQuantity} Qtl
                            </p>
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 self-center tabular-nums">
                            ₹{slip.total?.toLocaleString("en-IN")}
                          </span>
                        </label>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Slips Individual Editors */}
        {selectedSlipIds.size > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              3. Edit Farmer / Trader Details (Individual Override)
            </h3>
            
            <div className="space-y-3">
              {procurementSlips
                .filter(slip => selectedSlipIds.has(slip.slipId))
                .map((slip) => {
                  const isExpanded = editingSlipId === slip.slipId;
                  
                  // Get active values
                  const currentCrop = getSlipValue(slip, "crop");
                  const currentVariety = getSlipValue(slip, "variety");
                  const currentBags = getSlipValue(slip, "bags");
                  const currentQty = getSlipValue(slip, "netQuantity");
                  const currentRate = getSlipValue(slip, "rate");
                  const currentTotal = getSlipValue(slip, "total");

                  return (
                    <div key={slip.slipId} className="border border-slate-100 rounded-xl overflow-hidden shadow-sm transition-all bg-white">
                      {/* Header row */}
                      <button
                        type="button"
                        onClick={() => setEditingSlipId(isExpanded ? null : slip.slipId)}
                        className={`w-full flex items-center justify-between p-3 text-left transition-colors ${isExpanded ? "bg-slate-100" : "hover:bg-slate-50"}`}
                      >
                        <div className="flex-1 min-w-0 text-xs">
                          <p className="font-bold text-slate-800">
                            {slip.farmerName} <span className="text-[10px] font-normal text-slate-400">({slip.farmerCode})</span>
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">
                            Crop: <span className="text-slate-800">{currentCrop}</span> • Variety: <span className="text-slate-800">{currentVariety}</span> • Bags: <span className="text-slate-800">{currentBags}</span> • Qty: <span className="text-slate-800">{currentQty} Qtl</span> • Rate: <span className="text-slate-800">₹{currentRate}/Qtl</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-slate-800 tabular-nums">
                            ₹{Number(currentTotal).toLocaleString("en-IN")}
                          </span>
                          <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Expandable Editor Card */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Crop Name</label>
                            <input
                              type="text"
                              value={currentCrop}
                              onChange={(e) => updateSlipOverride(slip.slipId, "crop", e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Variety</label>
                            <input
                              type="text"
                              value={currentVariety}
                              onChange={(e) => updateSlipOverride(slip.slipId, "variety", e.target.value)}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">No. of Bags</label>
                            <input
                              type="number"
                              value={currentBags}
                              onChange={(e) => updateSlipOverride(slip.slipId, "bags", Number(e.target.value) || 0)}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Net Qty (Qtl)</label>
                            <input
                              type="number"
                              step="any"
                              value={currentQty}
                              onChange={(e) => updateSlipOverride(slip.slipId, "netQuantity", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Rate (₹/Qtl)</label>
                            <input
                              type="number"
                              step="any"
                              value={currentRate}
                              onChange={(e) => updateSlipOverride(slip.slipId, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Total Amount (₹)</label>
                            <input
                              type="number"
                              step="any"
                              value={currentTotal}
                              onChange={(e) => updateSlipOverride(slip.slipId, "total", e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-forest-500 text-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* EDITOR TABS */}
        {(calcs.activeSlips.length > 0 || originalProcurement) && (
          <div className="space-y-4">
            
            {/* Tab selector */}
            <div className="flex border-b border-slate-200 text-xs font-bold bg-white p-1 rounded-xl border">
              <button 
                onClick={() => setActiveTab("adhatiya")}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${activeTab === "adhatiya" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Addresses
              </button>
              <button 
                onClick={() => setActiveTab("billing")}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${activeTab === "billing" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                PO Meta
              </button>
              <button 
                onClick={() => setActiveTab("details")}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${activeTab === "details" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Rows Override
              </button>
              <button 
                onClick={() => setActiveTab("calculations")}
                className={`flex-1 py-2 text-center rounded-lg transition-all ${activeTab === "calculations" ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Taxes & Exp.
              </button>
            </div>

            {/* TAB CONTENT 1: ADDRESS BLOCKS */}
            {activeTab === "adhatiya" && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

                {/* ── 1. Vendor (Adhatiya / Seller) ── */}
                <button
                  type="button"
                  onClick={() => setOpenAddressSection(openAddressSection === "vendor" ? null : "vendor")}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${
                    openAddressSection === "vendor" ? "bg-slate-200" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "vendor" ? "bg-slate-300 text-slate-800 font-bold" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Building size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Vendor / Seller</span>
                      {openAddressSection !== "vendor" && vendor.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{vendor.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${openAddressSection === "vendor" ? "rotate-180" : ""}`} />
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${openAddressSection === "vendor" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-4 pt-3 space-y-3 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Vendor Name</label>
                      <input type="text" value={vendor.name} onChange={(e) => setVendor({ ...vendor, name: e.target.value })} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address Lines</label>
                      <textarea value={vendor.address} rows={4} onChange={(e) => setVendor({ ...vendor, address: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">GST/PAN No.</label>
                        <input type="text" value={vendor.gstNo} onChange={(e) => setVendor({ ...vendor, gstNo: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile No.</label>
                        <input type="text" value={vendor.mobile} onChange={(e) => setVendor({ ...vendor, mobile: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Id</label>
                        <input type="text" value={vendor.email} onChange={(e) => setVendor({ ...vendor, email: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. Billing Address ── */}
                <button
                  type="button"
                  onClick={() => setOpenAddressSection(openAddressSection === "billing" ? null : "billing")}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left border-t border-slate-100 transition-colors ${
                    openAddressSection === "billing" ? "bg-slate-200" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "billing" ? "bg-slate-300 text-slate-800 font-bold" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Receipt size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Billing Address</span>
                      {openAddressSection !== "billing" && billing.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{billing.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${openAddressSection === "billing" ? "rotate-180" : ""}`} />
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${openAddressSection === "billing" ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-4 pt-3 space-y-4 border-t border-slate-100">
                    {/* Billing Toggle Options */}
                    <div className="flex border border-slate-200 p-0.5 rounded-xl bg-slate-50 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setBillingOption("company")}
                        className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                          billingOption === "company" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Company Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingOption("custom")}
                        className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                          billingOption === "custom" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Custom Address
                      </button>
                    </div>

                    {/* Company Address Selector (if Option is Company) */}
                    {billingOption === "company" && (
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select Company Address</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                            <input
                              type="text"
                              value={companySearch}
                              onChange={(e) => {
                                setCompanySearch(e.target.value);
                                setShowCompanyDropdown(true);
                              }}
                              onFocus={() => setShowCompanyDropdown(true)}
                              placeholder="Search company address..."
                              className="w-full text-xs font-bold pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all"
                            />
                            {showCompanyDropdown && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowCompanyDropdown(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                                  {companyAddresses
                                    .filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                                    .map(c => (
                                      <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => handleSelectCompanyAddress(c)}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-between"
                                      >
                                        <span>{c.name}</span>
                                        <span className="text-[10px] text-slate-400">{c.district}, {c.state}</span>
                                      </button>
                                    ))}
                                  {companyAddresses.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 && (
                                    <p className="text-center text-[10px] text-slate-400 py-3">No matching company addresses</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCompanyCrudModal(true)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors border"
                          >
                            <Settings size={13} />
                            Manage
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Address Detail Form Fields */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Billing Name</label>
                      <input
                        type="text"
                        disabled={billingOption === "company"}
                        value={billing.name}
                        onChange={(e) => setBilling({ ...billing, name: e.target.value })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                          billingOption === "company" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address Lines</label>
                      <textarea
                        rows={4}
                        disabled={billingOption === "company"}
                        value={billing.address}
                        onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                        className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all resize-none ${
                          billingOption === "company" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">GST/PAN No.</label>
                        <input
                          type="text"
                          disabled={billingOption === "company"}
                          value={billing.gstNo}
                          onChange={(e) => setBilling({ ...billing, gstNo: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            billingOption === "company" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile No.</label>
                        <input
                          type="text"
                          disabled={billingOption === "company"}
                          value={billing.mobile}
                          onChange={(e) => setBilling({ ...billing, mobile: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            billingOption === "company" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Id</label>
                        <input
                          type="text"
                          disabled={billingOption === "company"}
                          value={billing.email}
                          onChange={(e) => setBilling({ ...billing, email: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            billingOption === "company" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3. Delivery Address ── */}
                <button
                  type="button"
                  onClick={() => setOpenAddressSection(openAddressSection === "delivery" ? null : "delivery")}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left border-t border-slate-100 transition-colors ${
                    openAddressSection === "delivery" ? "bg-slate-200" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "delivery" ? "bg-slate-300 text-slate-800 font-bold" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Truck size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Delivery Address</span>
                      {openAddressSection !== "delivery" && delivery.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{delivery.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${openAddressSection === "delivery" ? "rotate-180" : ""}`} />
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${openAddressSection === "delivery" ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-4 pt-3 space-y-4 border-t border-slate-100">
                    {/* Delivery Toggle Options */}
                    <div className="flex border border-slate-200 p-0.5 rounded-xl bg-slate-50 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("warehouse")}
                        className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                          deliveryOption === "warehouse" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Warehouse Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryOption("custom")}
                        className={`flex-1 py-1.5 text-center rounded-lg transition-all ${
                          deliveryOption === "custom" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Custom Address
                      </button>
                    </div>

                    {/* Warehouse Address Selector (if Option is Warehouse) */}
                    {deliveryOption === "warehouse" && (
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select Warehouse Address</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                            <input
                              type="text"
                              value={warehouseSearch}
                              onChange={(e) => {
                                setWarehouseSearch(e.target.value);
                                setShowWarehouseDropdown(true);
                              }}
                              onFocus={() => setShowWarehouseDropdown(true)}
                              placeholder="Search warehouse address..."
                              className="w-full text-xs font-bold pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all"
                            />
                            {showWarehouseDropdown && (
                              <>
                                <div className="fixed inset-0 z-30" onClick={() => setShowWarehouseDropdown(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                                  {warehouseAddresses
                                    .filter(w => w.name.toLowerCase().includes(warehouseSearch.toLowerCase()))
                                    .map(w => (
                                      <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => handleSelectWarehouseAddress(w)}
                                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 flex items-center justify-between"
                                      >
                                        <span>{w.name}</span>
                                        <span className="text-[10px] text-slate-400">{w.district}, {w.state}</span>
                                      </button>
                                    ))}
                                  {warehouseAddresses.filter(w => w.name.toLowerCase().includes(warehouseSearch.toLowerCase())).length === 0 && (
                                    <p className="text-center text-[10px] text-slate-400 py-3">No matching warehouse addresses</p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowWarehouseCrudModal(true)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 shrink-0 transition-colors border"
                          >
                            <Settings size={13} />
                            Manage
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Address Detail Form Fields */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Delivery Name</label>
                      <input
                        type="text"
                        disabled={deliveryOption === "warehouse"}
                        value={delivery.name}
                        onChange={(e) => setDelivery({ ...delivery, name: e.target.value })}
                        className={`w-full text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                          deliveryOption === "warehouse" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address Lines</label>
                      <textarea
                        rows={4}
                        disabled={deliveryOption === "warehouse"}
                        value={delivery.address}
                        onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                        className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all resize-none ${
                          deliveryOption === "warehouse" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">GST/PAN No.</label>
                        <input
                          type="text"
                          disabled={deliveryOption === "warehouse"}
                          value={delivery.gstNo}
                          onChange={(e) => setDelivery({ ...delivery, gstNo: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            deliveryOption === "warehouse" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile No.</label>
                        <input
                          type="text"
                          disabled={deliveryOption === "warehouse"}
                          value={delivery.mobile}
                          onChange={(e) => setDelivery({ ...delivery, mobile: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            deliveryOption === "warehouse" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Id</label>
                        <input
                          type="text"
                          disabled={deliveryOption === "warehouse"}
                          value={delivery.email}
                          onChange={(e) => setDelivery({ ...delivery, email: e.target.value })}
                          className={`w-full text-xs px-3 py-2 rounded-xl border border-slate-200 transition-all ${
                            deliveryOption === "warehouse" ? "bg-slate-100/60 text-slate-500 cursor-not-allowed" : "bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT 2: PO META */}
            {activeTab === "billing" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1.5">
                    Purchase Order Metadata
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">P.O. Number</label>
                      <input 
                        type="text" 
                        value={poNumber} 
                        onChange={(e) => setPoNumber(e.target.value)} 
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">PO Dated</label>
                      <input 
                        type="text" 
                        value={poDate} 
                        onChange={(e) => setPoDate(e.target.value)} 
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Payment Terms</label>
                      <input 
                        type="text" 
                        value={paymentTerms} 
                        onChange={(e) => setPaymentTerms(e.target.value)} 
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">DELIVERY Terms</label>
                      <input 
                        type="text" 
                        value={deliveryTerms} 
                        onChange={(e) => setDeliveryTerms(e.target.value)} 
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Authorized Signatory Name</label>
                      <input 
                        type="text" 
                        value={authorizedSignatory} 
                        onChange={(e) => setAuthorizedSignatory(e.target.value)} 
                        className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">Terms & Conditions Text</label>
                      <textarea 
                        value={termsAndConditions} 
                        rows={4}
                        onChange={(e) => setTermsAndConditions(e.target.value)} 
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all resize-none font-sans" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: ROWS OVERRIDES */}
            {activeTab === "details" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b pb-1.5">
                    Item Columns & Override Defaults
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">HSN Code</label>
                      <input 
                        type="text" 
                        value={hsnCode} 
                        onChange={(e) => setHsnCode(e.target.value)} 
                        className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Packing Size (kg)</label>
                      <input 
                        type="number" 
                        value={packingSize} 
                        onChange={(e) => setPackingSize(Number(e.target.value) || 0)} 
                        className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">GST %</label>
                      <input 
                        type="number" 
                        value={gstPercent} 
                        onChange={(e) => setGstPercent(Number(e.target.value) || 0)} 
                        className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>

                    {calcs.activeSlips.length <= 1 && (
                      <>
                        <div className="col-span-2 border-t border-slate-100 pt-3">
                          <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Single Item Row Manual Overrides</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Override Crop</label>
                          <input 
                            type="text" 
                            placeholder="e.g. PB-1"
                            value={manualCrop} 
                            onChange={(e) => setManualCrop(e.target.value)} 
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Override Variety</label>
                          <input 
                            type="text" 
                            value={manualVariety} 
                            onChange={(e) => setManualVariety(e.target.value)} 
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Override Rate (₹/Qtl)</label>
                          <input 
                            type="number" 
                            placeholder="Auto"
                            value={manualRate} 
                            onChange={(e) => setManualRate(e.target.value === "" ? "" : Number(e.target.value))} 
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Override Net Qty (Qtl)</label>
                          <input 
                            type="number" 
                            placeholder="Auto"
                            value={manualNetQty} 
                            onChange={(e) => setManualNetQty(e.target.value === "" ? "" : Number(e.target.value))} 
                            className="w-full text-xs font-semibold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                          />
                        </div>
                      </>
                    )}

                    <div className="col-span-2 border-t border-slate-100 pt-3">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1.5 uppercase">Override Total Bags</label>
                      <input 
                        type="number" 
                        placeholder="Auto sum of slips"
                        value={poBags || ""} 
                        onChange={(e) => setPoBags(Number(e.target.value) || 0)} 
                        className="w-full text-xs font-bold px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 4: TAXES AND EXPENSES */}
            {activeTab === "calculations" && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="border-b pb-1.5 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Tax & Expenses Calculations
                    </h3>
                    <button 
                      type="button" 
                      onClick={() => {
                        setOverrides({
                          mandiTax: "", hammali: "", commission: "", sutli: "", otherExpenses: "", bonus: "", freight: "", roundOff: "", finalAmount: ""
                        });
                      }}
                      className="text-[9px] text-red-600 bg-red-50 hover:bg-red-100 font-bold px-2 py-0.5 rounded transition-all"
                    >
                      Clear Overrides
                    </button>
                  </div>

                  <div className="space-y-3">
                    
                    {/* Mandi Tax */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Mandi Tax %</label>
                        <input 
                          type="number" 
                          value={rates.mandiTaxPercent} 
                          onChange={(e) => setRates({ ...rates, mandiTaxPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Mandi Tax Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.mandiTax.toFixed(2)})`}
                          value={overrides.mandiTax} 
                          onChange={(e) => setOverrides({ ...overrides, mandiTax: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Hammali */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Hammali/Bag (₹)</label>
                        <input 
                          type="number" 
                          value={rates.hammaliRate} 
                          onChange={(e) => setRates({ ...rates, hammaliRate: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Hammali Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.hammali.toFixed(2)})`}
                          value={overrides.hammali} 
                          onChange={(e) => setOverrides({ ...overrides, hammali: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Commission */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Commission %</label>
                        <input 
                          type="number" 
                          value={rates.commissionPercent} 
                          onChange={(e) => setRates({ ...rates, commissionPercent: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Commission Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.commission.toFixed(2)})`}
                          value={overrides.commission} 
                          onChange={(e) => setOverrides({ ...overrides, commission: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Sutli */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Sutli/Bag (₹)</label>
                        <input 
                          type="number" 
                          value={rates.sutliRate} 
                          onChange={(e) => setRates({ ...rates, sutliRate: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Sutli Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.sutli.toFixed(2)})`}
                          value={overrides.sutli} 
                          onChange={(e) => setOverrides({ ...overrides, sutli: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Bonus */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Bonus/Qtl (₹)</label>
                        <input 
                          type="number" 
                          value={rates.bonusRate} 
                          onChange={(e) => setRates({ ...rates, bonusRate: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Bonus Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.bonus.toFixed(2)})`}
                          value={overrides.bonus} 
                          onChange={(e) => setOverrides({ ...overrides, bonus: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Freight */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Freight/Qtl (₹)</label>
                        <input 
                          type="number" 
                          value={rates.freightRate} 
                          onChange={(e) => setRates({ ...rates, freightRate: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Freight Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.freight.toFixed(2)})`}
                          value={overrides.freight} 
                          onChange={(e) => setOverrides({ ...overrides, freight: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Other Expenses */}
                    <div className="grid grid-cols-3 gap-2 items-center border-b border-slate-100 pb-2">
                      <div className="col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Other Exp (₹)</label>
                        <input 
                          type="number" 
                          value={rates.otherExpenses} 
                          onChange={(e) => setRates({ ...rates, otherExpenses: parseFloat(e.target.value) || 0 })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all" 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-blue-600 block mb-1">Other Exp Amt (Override)</label>
                        <input 
                          type="number" 
                          placeholder={`Auto (₹${calcs.otherExpenses.toFixed(2)})`}
                          value={overrides.otherExpenses} 
                          onChange={(e) => setOverrides({ ...overrides, otherExpenses: e.target.value === "" ? "" : Number(e.target.value) })}
                          className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                        />
                      </div>
                    </div>

                    {/* Round Off */}
                    <div>
                      <label className="text-[10px] font-bold text-blue-600 block mb-1">Round Off (Override)</label>
                      <input 
                        type="number" 
                        step="any"
                        placeholder={`Auto (₹${calcs.roundOff.toFixed(2)})`}
                        value={overrides.roundOff} 
                        onChange={(e) => setOverrides({ ...overrides, roundOff: e.target.value === "" ? "" : Number(e.target.value) })}
                        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:outline-none transition-all font-bold text-right" 
                      />
                    </div>

                    {/* Final Amount */}
                    <div>
                      <label className="text-[10px] font-bold text-red-600 block mb-1">Final Total Amount (Override)</label>
                      <input 
                        type="number" 
                        placeholder={`Auto (₹${calcs.finalAmount.toLocaleString("en-IN")})`}
                        value={overrides.finalAmount} 
                        onChange={(e) => setOverrides({ ...overrides, finalAmount: e.target.value === "" ? "" : Number(e.target.value) })}
                        className="w-full text-sm px-2 py-1.5 rounded-lg border border-red-300 bg-red-50 focus:bg-white focus:border-red-500 focus:outline-none transition-all font-extrabold text-right text-red-700" 
                      />
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mt-6">
              <input 
                id="confirm-billed-checkbox"
                type="checkbox"
                checked={confirmBilled}
                onChange={(e) => setConfirmBilled(e.target.checked)}
                disabled={poStatus === "BILLED"}
                className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <label htmlFor="confirm-billed-checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                I confirm this Purchase Order is <span className="text-emerald-700 font-extrabold">BILLED & APPROVED</span>.
              </label>
            </div>

            {/* Desktop Actions */}
            <div className="hidden xl:flex pt-4 pb-12 justify-end gap-3">
            {(poStatus === "BILLED" || confirmBilled) && (
              <button 
                onClick={handlePrint} 
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all bg-white shadow-sm"
              >
                <Download size={18} /> Download / Print
              </button>
            )}
            <button 
                onClick={handleSave} 
                disabled={saving || !confirmBilled} 
                className="px-6 py-2.5 bg-forest-800 text-white font-semibold rounded-xl hover:bg-forest-700 active:bg-forest-900 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex items-center gap-2 shadow-md"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                {saving ? "Saving..." : "Save PO"}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* RIGHT COLUMN: A4 PORTRAIT PREVIEW */}
      <div className={`w-full xl:w-[55%] h-full xl:max-h-screen xl:overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto print:max-h-none bg-slate-300/60 flex flex-col items-start xl:items-center py-8 print:p-0 print:bg-white print:w-full print:block pb-40 xl:pb-8 ${mobileTab === 'edit' && (calcs.activeSlips.length > 0 || originalProcurement) ? 'hidden xl:flex' : 'flex'}`}>
        <style>{`
          .po-preview-wrapper {
            position: relative;
            width: 210mm;
            height: 297mm;
          }
          .po-preview-inner {
            transform: none;
          }
          @media (min-width: 1280px) { /* xl */
            .po-preview-wrapper {
              width: calc(210mm * 0.65);
              height: calc(297mm * 0.65);
            }
            .po-preview-inner {
              transform: scale(0.65);
              transform-origin: top left;
            }
          }
          @media (min-width: 1536px) { /* 2xl */
            .po-preview-wrapper {
              width: calc(210mm * 0.85);
              height: calc(297mm * 0.85);
            }
            .po-preview-inner {
              transform: scale(0.85);
              transform-origin: top left;
            }
          }
          @media print {
            .po-preview-wrapper {
              width: 100% !important;
              height: auto !important;
            }
            #printable-po {
              transform: none !important;
              position: static !important;
              width: 100% !important;
              min-width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
          }
          .po-grid-border {
            border: 1.5px solid black;
          }
          .po-cell-border-r {
            border-right: 1.5px solid black;
          }
          .po-cell-border-b {
            border-bottom: 1.5px solid black;
          }
          .po-cell-border-t {
            border-top: 1.5px solid black;
          }
          .po-table-cell-border {
            border-right: 1px solid black;
            border-bottom: 1px solid black;
          }
        `}</style>
        
        <div className="po-preview-wrapper ml-4 xl:mx-auto shrink-0 print:w-full print:h-auto">
          {loading ? (
            <div className="po-preview-inner w-[210mm] min-h-[297mm] bg-white rounded-xl shadow-2xl flex items-center justify-center absolute top-0 left-0">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <Loader2 size={36} className="animate-spin text-forest-600" />
                <p className="text-sm font-semibold">Generating live preview...</p>
              </div>
            </div>
          ) : calcs.activeSlips.length > 0 || originalProcurement ? (
            <div id="printable-po" className="po-preview-inner w-[210mm] min-w-[210mm] bg-white text-black shadow-2xl print:shadow-none p-6 print:p-0 text-[11px] leading-tight font-sans absolute top-0 left-0">

            <div className="po-grid-border flex flex-col min-h-[268mm] justify-between">
              <div>
                
                {/* 1. LOGO & HEADER ROW */}
                <div className="flex po-cell-border-b min-h-16 items-center bg-slate-50/10 py-1">
                  <div className="w-[20%] po-cell-border-r h-full flex items-center justify-center p-2">
                    {/* FARMER ERP LOGO */}
                    <div className="flex items-center gap-1.5 select-none">
                      <div className="w-9 h-9 bg-gradient-to-br from-forest-500 to-forest-600 rounded-lg flex items-center justify-center shadow-sm">
                        <Sprout className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="text-left leading-tight">
                        <span className="text-[9px] font-black text-slate-800 tracking-tight block">FARMER ERP</span>
                        <span className="text-[6.5px] font-bold text-forest-600 tracking-wider block">Pvt Ltd</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-[60%] text-center">
                    <h1 className="text-lg font-black tracking-widest uppercase text-slate-800">PURCHASE ORDER</h1>
                    <h2 className="text-xs font-bold uppercase text-slate-600">{billing.name || "Farmer ERP Pvt Ltd"}</h2>
                  </div>
                  <div className="w-[20%] border-l-[1.5px] border-black h-full flex items-center justify-center p-1">
                    <div className="print:hidden">
                      {poStatus === "BILLED" ? (
                        <div className="border-2 border-emerald-600 text-emerald-600 font-extrabold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider font-sans rotate-[-3deg] shadow-sm">
                          APPROVED
                        </div>
                      ) : (
                        <div className="border-2 border-red-600 text-red-600 font-extrabold text-[11px] px-2 py-0.5 rounded uppercase tracking-wider font-sans rotate-[-3deg] shadow-sm">
                          DRAFT
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. VENDOR & METADATA GRID */}
                <div className="flex po-cell-border-b">
                  
                  {/* Left Column: Vendor Address block */}
                  <div className="w-1/2 po-cell-border-r p-2 space-y-1">
                    <p className="font-extrabold underline uppercase text-xs text-black">
                      {vendor.isAdhatiya ? "Adhatiya:" : "Vender:"}
                    </p>
                    <p className="font-black text-sm uppercase text-black">{vendor.name || "ABC PVT LTD"}</p>
                    <p className="uppercase leading-tight text-xs whitespace-pre-wrap font-bold text-slate-600">{vendor.address || "123, Kisan Market, Near Railway Station\nSector-12, Gandhinagar, Gujarat - 382010"}</p>
                    <div className="pt-0.5 space-y-0.5 text-xs font-bold text-slate-600">
                      <p><span className="font-extrabold text-black">GST/PAN No.:</span> {vendor.gstNo || "24ABCDE1234F1Z5"}</p>
                      <p><span className="font-extrabold text-black">Mobile no.:</span> {vendor.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-extrabold text-black">Email Id:</span> {vendor.email || "vendor@example.com"}</p>
                    </div>
                  </div>

                  {/* Right Column: PO info & Payment/Delivery */}
                  <div className="w-1/2 flex flex-col">
                    <div className="flex po-cell-border-b h-7">
                      <div className="w-[65%] po-cell-border-r p-1.5 flex items-center font-bold text-xs">
                        P.O. No.: <span className="font-black text-slate-800 ml-1 font-mono text-sm">{poNumber || "PO/JK/25-26-01"}</span>
                      </div>
                      <div className="w-[35%] p-1.5 flex items-center text-xs">
                        Dated: <span className="ml-1 font-bold">{poDate}</span>
                      </div>
                    </div>
                    
                    <div className="p-2 space-y-1 flex-1 flex flex-col justify-center text-xs font-bold text-slate-600">
                      <p><span className="font-extrabold text-black uppercase">Payment Terms:</span> {paymentTerms}</p>
                      <p><span className="font-extrabold text-black uppercase">DELIVERY:</span> {deliveryTerms || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. BILLING & DELIVERY ADDRESS ROW */}
                <div className="flex po-cell-border-b min-h-24 py-1">
                  {/* Billing Address */}
                  <div className="w-1/2 po-cell-border-r p-2 space-y-0.5">
                    <p className="font-extrabold underline uppercase text-xs text-black">Billing Address:</p>
                    <p className="font-black uppercase text-xs text-black">{billing.name || "Farmer ERP Pvt Ltd"}</p>
                    <p className="uppercase leading-none text-xs whitespace-pre-wrap font-bold text-slate-600">{billing.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                    <div className="text-xs pt-1 font-bold text-slate-600 font-bold">
                      <p><span className="font-extrabold text-black">GST/PAN:</span> {billing.gstNo || "24AAACF1234A1Z5"}</p>
                      <p><span className="font-extrabold text-black">Mobile:</span> {billing.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-extrabold text-black">Email:</span> {billing.email || "contact@farmererp.com"}</p>
                    </div>
                  </div>
                  
                  {/* Delivery Address */}
                  <div className="w-1/2 p-2 space-y-0.5">
                    <p className="font-extrabold underline uppercase text-xs text-black">Delivery Address:</p>
                    <p className="font-black uppercase text-xs text-black">{delivery.name || "Farmer ERP Pvt Ltd"}</p>
                    <p className="uppercase leading-none text-xs whitespace-pre-wrap font-bold text-slate-600">{delivery.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                    <div className="text-xs pt-1 font-bold text-slate-600 font-bold">
                      <p><span className="font-extrabold text-black">GST/PAN:</span> {delivery.gstNo || "24AAACF1234A1Z5"}</p>
                      <p><span className="font-extrabold text-black">Mobile:</span> {delivery.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-extrabold text-black">Email:</span> {delivery.email || "contact@farmererp.com"}</p>
                    </div>
                  </div>
                </div>

                {/* 4. ITEMS TABLE */}
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="po-cell-border-b font-bold bg-slate-50 text-xs">
                      <th className="po-table-cell-border p-1 w-[5%]">Sr. No.</th>
                      <th className="po-table-cell-border p-1 w-[30%] text-left px-2">Farmer Name & Code</th>
                      <th className="po-table-cell-border p-1 w-[15%]">Description</th>
                      <th className="po-table-cell-border p-1 w-[8%]">Packing</th>
                      <th className="po-table-cell-border p-1 w-[10%]">No. of Bag</th>
                      <th className="po-table-cell-border p-1 w-[10%]">Quantity (Qtl.)</th>
                      <th className="po-table-cell-border p-1 w-[10%] text-right pr-2">Rate</th>
                      <th className="p-1 w-[12%] text-right pr-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Rows */}
                    {calcs.activeSlips.map((item: any, idx: number) => {
                      const qty = item.netQuantity || 0;
                      const rate = (calcs.activeSlips.length === 1 && manualRate !== "") ? Number(manualRate) : (item.rate || 0);
                      const displayQty = (calcs.activeSlips.length === 1 && manualNetQty !== "") ? Number(manualNetQty) : qty;
                      const displayBags = (calcs.activeSlips.length === 1 && poBags > 0) ? poBags : (item.bags || 0);
                      
                      const amount = displayQty * rate;
                      
                      return (
                        <tr key={item.slipId} className="text-xs">
                          <td className="po-table-cell-border p-1">{idx + 1}</td>
                          <td className="po-table-cell-border p-1 text-left px-2">
                            <span className="font-bold">{item.farmerName || item.farmer?.name || "Unknown Farmer"}</span>
                            <span className="block text-[10px] text-slate-500 font-medium">Code:{item.farmerCode || "—"}</span>
                          </td>
                          <td className="po-table-cell-border p-1 uppercase text-slate-700">
                            {idx === 0 && manualCrop ? manualCrop : item.crop} {idx === 0 && manualVariety ? manualVariety : item.variety}
                          </td>
                          <td className="po-table-cell-border p-1">{packingSize} kg</td>
                          <td className="po-table-cell-border p-1 font-mono">{displayBags.toFixed(2)}</td>
                          <td className="po-table-cell-border p-1 font-mono">{displayQty.toFixed(2)}</td>
                          <td className="po-table-cell-border p-1 text-right pr-2 font-mono">
                            {rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="border-b border-black p-1 text-right pr-2 font-mono font-semibold">
                            ₹{amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Dummy blank spacer row matching the image template */}
                    <tr className="h-6">
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="po-table-cell-border"></td>
                      <td className="border-b border-black"></td>
                    </tr>

                    {/* Table Totals Row */}
                    <tr className="font-bold text-xs bg-slate-50/30 po-cell-border-b">
                      <td colSpan={4} className="po-table-cell-border p-1.5 font-bold text-center">Total</td>
                      <td className="po-table-cell-border p-1.5 font-mono">{calcs.totalBags.toFixed(2)}</td>
                      <td className="po-table-cell-border p-1.5 font-mono">{calcs.totalQty.toFixed(2)}</td>
                      <td className="po-table-cell-border p-1.5"></td>
                      <td className="p-1.5 text-right pr-2 font-mono font-bold">
                        ₹{calcs.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    {/* 5. TAXES & CALCULATIONS (Tucked to bottom right) */}
                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left">
                        {/* Empty spacing box */}
                      </td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Mandi Tax/Qtl. ({rates.mandiTaxPercent}%)
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.mandiTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Hammali/Bag (₹{rates.hammaliRate})
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.hammali.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Commission/Qtl. ({rates.commissionPercent}%)
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Sutli/Bag (₹{rates.sutliRate})
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.sutli.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Other Expenses
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        {calcs.otherExpenses > 0 ? `₹${calcs.otherExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "-"}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Bonus/Qtl (₹{rates.bonusRate})
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.bonus.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Freight/Qtl (₹{rates.freightRate})
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.freight.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>

                    <tr className="text-xs">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1 text-right font-semibold pr-2">
                        Round Off(±)
                      </td>
                      <td className="border-b border-black p-1 text-right pr-2 font-mono">
                        ₹{calcs.roundOff.toFixed(2)}
                      </td>
                    </tr>

                    <tr className="font-bold text-xs bg-slate-50/40">
                      <td colSpan={4} className="border-r border-black align-top p-2 text-left"></td>
                      <td colSpan={3} className="po-table-cell-border p-1.5 text-right font-bold pr-2 text-sm">
                        Final Amount
                      </td>
                      <td className="border-b border-black p-1.5 text-right pr-2 font-mono font-black text-sm text-slate-900">
                        ₹{calcs.finalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 6. BOTTOM ROW: TOTAL IN WORDS, T&C & SIGNATORY */}
              <div className="po-cell-border-t">
                
                {/* Total amount in words block */}
                <div className="p-2 po-cell-border-b text-xs">
                  <span className="font-extrabold text-black uppercase">Total amount in words:</span> <span className="font-black uppercase text-slate-900 ml-1 text-xs">{numberToWords(calcs.finalAmount)}</span>
                </div>

                <div className="flex min-h-28">
                  {/* Left Side: Terms and Conditions */}
                  <div className="w-[65%] po-cell-border-r p-2 space-y-1 text-xs">
                    <p className="font-extrabold underline uppercase text-xs text-black">Terms & Conditions :</p>
                    <p className="uppercase leading-normal font-bold text-slate-600 whitespace-pre-wrap">{termsAndConditions}</p>
                  </div>
                  
                  {/* Right Side: Signatory Box */}
                  <div className="w-[35%] flex flex-col justify-between items-center p-2 relative min-h-[112px]">
                    <p className="font-bold text-xs text-center leading-tight">For {authorizedSignatory || "Farmer ERP Pvt Ltd"}</p>
                    
                    {/* FARMER ERP STAMP */}
                    <div className="my-1 border-2 border-double border-blue-600/80 rounded-full w-[70px] h-[70px] flex flex-col items-center justify-center rotate-[-10deg] scale-90 select-none opacity-85 pointer-events-none font-mono bg-white/40 shadow-sm print:opacity-100">
                      <span className="text-[6.5px] font-black text-blue-700 tracking-wider leading-none">FARMER ERP</span>
                      <div className="w-10 h-[0.5px] bg-blue-500/50 my-0.5"></div>
                      <span className="text-[8px] font-extrabold text-blue-600 leading-none">STAMP</span>
                      <div className="w-10 h-[0.5px] bg-blue-500/50 my-0.5"></div>
                      <span className="text-[5.5px] text-blue-500 font-bold uppercase tracking-tight leading-none">AUTHORIZED</span>
                    </div>

                    <p className="font-bold text-xs text-slate-800 underline uppercase tracking-wide">Authorized Signatory</p>
                  </div>
                </div>

                {/* Computer generated disclaimer */}
                <div className="p-1 border-t-[1px] border-black text-center text-[8.5px] font-semibold text-slate-500 tracking-wider">
                  This is Computer Generated Invoice
                </div>
              </div>

            </div>
            </div>
          ) : (
            <div className="po-preview-inner w-[210mm] min-h-[297mm] flex flex-col items-center justify-center text-slate-400 p-8 bg-white rounded-xl shadow-2xl absolute top-0 left-0">
              <FileText size={48} className="mb-4 opacity-30 text-forest-700" />
              <p className="font-semibold text-slate-700 text-sm">Select an Adhatiya or Fetch a Slip ID to begin</p>
              <p className="text-xs text-slate-500 text-center max-w-sm mt-1">
                Select an agent from the database to load their vendor coordinates and check matching procurements.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE STICKY ACTION BAR */}
      {(calcs.activeSlips.length > 0 || originalProcurement) && (
        <div className="xl:hidden fixed bottom-[52px] left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-50 flex flex-col gap-3 print:hidden">
          {/* Confirmation Checkbox for Mobile */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <input 
              id="confirm-billed-checkbox-mobile"
              type="checkbox"
              checked={confirmBilled}
              onChange={(e) => setConfirmBilled(e.target.checked)}
              disabled={poStatus === "BILLED"}
              className="w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
            />
            <label htmlFor="confirm-billed-checkbox-mobile" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
              Confirm this PO is <span className="text-emerald-700 font-extrabold">BILLED & APPROVED</span>.
            </label>
          </div>
          
          <div className="flex justify-between gap-3">
            {(poStatus === "BILLED" || confirmBilled) && (
              <button 
                onClick={handlePrint} 
                className="flex-1 justify-center px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all bg-white shadow-sm"
              >
                <Download size={18} /> Download / Print
              </button>
            )}
            <button 
              onClick={handleSave} 
              disabled={saving || !confirmBilled} 
              className="flex-1 justify-center px-4 py-3 bg-forest-800 text-white font-semibold rounded-xl hover:bg-forest-700 active:bg-forest-900 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-2 shadow-md"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
              {saving ? "Saving..." : "Save PO"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: DATABASE MANAGER FOR ADHATIYAS */}
      {showCrudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCrudModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users size={18} className="text-forest-700" />
                  Manage Adhatiyas Database
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setCrudName("");
                    setCrudAddress("");
                    setCrudVillage("");
                    setCrudBlock("");
                    setCrudPinCode("");
                    setCrudState("");
                    setCrudDistrict("");
                    setCrudMandi("");
                    setStateSearch("");
                    setDistrictSearch("");
                    setMandiSearch("");
                    setCrudGst("");
                    setCrudMobile("");
                    setCrudEmail("");
                    setEditingAdhatiyaId(null);
                    setShowAddModal(true);
                  }}
                  className="px-3 py-1.5 bg-forest-700 text-white text-xs font-bold rounded-xl hover:bg-forest-800 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>

              {/* List of current Adhatiyas */}
              <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2">
                {dbAdhatiyas.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No Adhatiyas in database. Create one now!</p>
                ) : (
                  dbAdhatiyas.map((ad) => (
                    <div key={ad.id} className="p-3 border border-slate-100 rounded-2xl flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{ad.name}</p>
                        <p className="text-slate-500">
                          {[
                            ad.address,
                            [ad.village, ad.block].filter(Boolean).join(", "),
                            [ad.district, ad.state].filter(Boolean).join(", ") + (ad.pinCode ? ` - ${ad.pinCode}` : ""),
                            ad.mandi ? `Mandi: ${ad.mandi}` : ""
                          ].filter(Boolean).join(", ")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          GST: {ad.gstNo || "—"} • Mob: {ad.mobile || "—"} • Email: {ad.email || "—"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdhatiyaId(ad.id);
                            setCrudName(ad.name);
                            setCrudAddress(ad.address || "");
                            setCrudVillage(ad.village || "");
                            setCrudBlock(ad.block || "");
                            setCrudPinCode(ad.pinCode || "");
                            setCrudState(ad.state || "");
                            setCrudDistrict(ad.district || "");
                            setCrudMandi(ad.mandi || "");
                            setStateSearch(ad.state || "");
                            setDistrictSearch(ad.district || "");
                            setMandiSearch(ad.mandi || "");
                            setCrudGst(ad.gstNo || "");
                            setCrudMobile(ad.mobile || "");
                            setCrudEmail(ad.email || "");
                            setShowAddModal(true);
                          }}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdhatiya(ad.id, ad.name)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-white rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCrudModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT ADHATIYA FORM */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
              {editingAdhatiyaId ? "Edit Adhatiya Details" : "Create New Adhatiya Record"}
            </h3>
            
            <form onSubmit={handleSaveAdhatiya} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Adhatiya Name*</label>
                <input 
                  type="text" 
                  required
                  value={crudName} 
                  onChange={(e) => setCrudName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. ABC Pvt Ltd"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address (Street / House No.)*</label>
                <input 
                  type="text" 
                  required
                  value={crudAddress} 
                  onChange={(e) => setCrudAddress(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. Near Mandi Road"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Village*</label>
                  <input 
                    type="text" 
                    required
                    value={crudVillage} 
                    onChange={(e) => setCrudVillage(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Village Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Block*</label>
                  <input 
                    type="text" 
                    required
                    value={crudBlock} 
                    onChange={(e) => setCrudBlock(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Block / Taluka"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pin Code</label>
                <input 
                  type="text" 
                  value={crudPinCode} 
                  onChange={(e) => setCrudPinCode(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="6-digit pin code"
                  maxLength={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative combobox-state">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State Search*</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      value={stateSearch}
                      onChange={(e) => {
                        setStateSearch(e.target.value);
                        setShowStateDropdown(true);
                      }}
                      onFocus={() => {
                        setStateSearch(crudState);
                        setShowStateDropdown(true);
                      }}
                      placeholder="Search State..."
                      className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                  </div>
                  {showStateDropdown && (
                    <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-36 overflow-y-auto p-1">
                        {filteredStates.length > 0 ? (
                          filteredStates.map((s) => (
                            <div
                              key={s}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCrudState(s);
                                setStateSearch(s);
                                setCrudDistrict("");
                                setDistrictSearch("");
                                setCrudMandi("");
                                setMandiSearch("");
                                setShowStateDropdown(false);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudState === s ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <span className="truncate pr-1">{s}</span>
                              {crudState === s && <Check size={12} />}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No states</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative combobox-district">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District Search*</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input
                      value={districtSearch}
                      onChange={(e) => {
                        setDistrictSearch(e.target.value);
                        setShowDistrictDropdown(true);
                      }}
                      onFocus={() => {
                        setDistrictSearch(crudDistrict);
                        setShowDistrictDropdown(true);
                      }}
                      disabled={!crudState}
                      placeholder={crudState ? "Search District..." : "Select State"}
                      className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                  </div>
                  {showDistrictDropdown && (
                    <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                      <div className="max-h-36 overflow-y-auto p-1">
                        {filteredDistricts.length > 0 ? (
                          filteredDistricts.map((d) => (
                            <div
                              key={d}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCrudDistrict(d);
                                setDistrictSearch(d);
                                setCrudMandi("");
                                setMandiSearch("");
                                setShowDistrictDropdown(false);
                              }}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudDistrict === d ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                              <span className="truncate pr-1">{d}</span>
                              {crudDistrict === d && <Check size={12} />}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No districts</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative combobox-mandi">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mandi Search*</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                  <input
                    value={mandiSearch}
                    onChange={(e) => {
                      setMandiSearch(e.target.value);
                      setShowMandiDropdown(true);
                    }}
                    onFocus={() => {
                      setMandiSearch(crudMandi);
                      setShowMandiDropdown(true);
                    }}
                    disabled={!crudDistrict}
                    placeholder={crudDistrict ? "Search Mandi..." : "Select District"}
                    className="w-full pl-7 pr-7 py-2 border rounded-xl focus:ring-2 focus:ring-forest-500/20 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
                </div>
                {showMandiDropdown && (
                  <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="max-h-36 overflow-y-auto p-1">
                      {filteredMandis.length > 0 ? (
                        filteredMandis.map((m) => (
                          <div
                            key={m.mandiName}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCrudMandi(m.mandiName);
                              setMandiSearch(m.mandiName);
                              setShowMandiDropdown(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-[11px] ${crudMandi === m.mandiName ? 'bg-forest-50 text-forest-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                          >
                            <div className="flex flex-col">
                              <span>{m.mandiName}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{m.district}, {m.state}</span>
                            </div>
                            {crudMandi === m.mandiName && <Check size={12} />}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-[10px] text-slate-500 text-center">No mandis</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GST/PAN No.*</label>
                <input 
                  type="text" 
                  required
                  value={crudGst} 
                  onChange={(e) => setCrudGst(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. 06AAGCA3319R1ZD"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile No.*</label>
                  <input 
                    type="text" 
                    required
                    value={crudMobile} 
                    onChange={(e) => setCrudMobile(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. 9876543210"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Id</label>
                  <input 
                    type="email" 
                    value={crudEmail} 
                    onChange={(e) => setCrudEmail(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. contact@agent.com"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 justify-end text-xs border-t mt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-forest-700 text-white font-bold rounded-xl hover:bg-forest-800"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE ADHATIYA CONFIRMATION MODAL */}
      {deleteStep > 0 && adhatiyaToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 text-left">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => {
            setDeleteStep(0);
            setAdhatiyaToDelete(null);
            setCaptchaInput("");
          }} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden">
            {deleteStep === 1 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>⚠️</span> Warning: Deleting Adhatiya
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  You are about to permanently delete the Adhatiya record for <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>.
                  <br /><br />
                  This action is highly destructive. Existing records, transactions, or purchase orders associated with this Adhatiya might be affected or lose their relationship context.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const code = generateRandomCaptcha();
                      setCaptchaCode(code);
                      setCaptchaInput("");
                      setDeleteStep(2);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 2 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
                  Security Verification
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  To confirm you want to delete <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>, please type the following 6-character verification code:
                </p>
                
                <div className="bg-slate-100 py-3 px-4 rounded-xl text-center mb-4 tracking-[0.3em] font-mono text-lg font-black text-slate-700 select-none border border-slate-200">
                  {captchaCode}
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    placeholder="Enter verification code"
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-red-500/20 focus:outline-none text-center font-mono font-bold text-sm tracking-widest text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                      setCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (captchaInput.trim().toUpperCase() === captchaCode) {
                        setDeleteStep(3);
                      } else {
                        addToast({
                          type: "error",
                          title: "Invalid Code",
                          message: "The entered verification code did not match. Please try again."
                        });
                        setCaptchaCode(generateRandomCaptcha());
                        setCaptchaInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 3 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider">
                  Final Confirmation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  Are you absolutely sure you want to delete <strong className="text-slate-800 font-bold">{adhatiyaToDelete.name}</strong>?
                  <br /><br />
                  This is the final confirmation. There is no undo.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteStep(0);
                      setAdhatiyaToDelete(null);
                      setCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteAdhatiyaConfirmed(adhatiyaToDelete.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DATABASE MANAGER FOR COMPANY ADDRESSES */}
      {showCompanyCrudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCompanyCrudModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building size={18} className="text-forest-700" />
                  Manage Company Addresses
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAddrName("");
                    setAddrStreet("");
                    setAddrVillage("");
                    setAddrBlock("");
                    setAddrPinCode("");
                    setAddrState("");
                    setAddrDistrict("");
                    setAddrPlace("");
                    setAddrGstNo("");
                    setAddrMobile("");
                    setAddrEmail("");
                    setEditingCompanyAddressId(null);
                    setShowCompanyAddModal(true);
                  }}
                  className="px-3 py-1.5 bg-forest-700 text-white text-xs font-bold rounded-xl hover:bg-forest-800 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>

              {/* List of current Company Addresses */}
              <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2">
                {companyAddresses.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No Company Addresses in database. Create one now!</p>
                ) : (
                  companyAddresses.map((c) => (
                    <div key={c.id} className="p-3 border border-slate-100 rounded-2xl flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                        <p className="text-slate-500 font-medium">GSTIN/PAN: {c.gstNo || "N/A"}</p>
                        <p className="text-slate-400 font-medium">{c.address}, {c.place}, {c.district}, {c.state} - {c.pinCode || ""}</p>
                        <p className="text-slate-400">Mobile: {c.mobile} | Email: {c.email || "N/A"}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCompanyAddressId(c.id);
                            setAddrName(c.name);
                            setAddrStreet(c.address);
                            setAddrVillage(c.village || "");
                            setAddrBlock(c.block || "");
                            setAddrPinCode(c.pinCode || "");
                            setAddrState(c.state);
                            setAddrDistrict(c.district);
                            setAddrPlace(c.place || "");
                            setAddrGstNo(c.gstNo || "");
                            setAddrMobile(c.mobile);
                            setAddrEmail(c.email || "");
                            setShowCompanyAddModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border"
                          title="Edit Details"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCompanyAddress(c.id, c.name)}
                          className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                          title="Delete Address"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t pt-3 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCompanyCrudModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT COMPANY ADDRESS FORM */}
      {showCompanyAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCompanyAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
              {editingCompanyAddressId ? "Edit Company Address Details" : "Create New Company Address"}
            </h3>
            
            <form onSubmit={handleSaveCompanyAddress} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company Name*</label>
                <input 
                  type="text" 
                  required
                  value={addrName} 
                  onChange={(e) => setAddrName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. Farmer ERP Pvt Ltd"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address Lines (Street / House No.)*</label>
                <input 
                  type="text" 
                  required
                  value={addrStreet} 
                  onChange={(e) => setAddrStreet(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. 12, Cyber City"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Place / City*</label>
                  <input 
                    type="text" 
                    required
                    value={addrPlace} 
                    onChange={(e) => setAddrPlace(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Place/City Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pin Code</label>
                  <input 
                    type="text" 
                    value={addrPinCode} 
                    onChange={(e) => setAddrPinCode(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="6-digit pin code"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District*</label>
                  <input 
                    type="text" 
                    required
                    value={addrDistrict} 
                    onChange={(e) => setAddrDistrict(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="District"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State*</label>
                  <input 
                    type="text" 
                    required
                    value={addrState} 
                    onChange={(e) => setAddrState(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="State"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSTIN/PAN No.</label>
                <input 
                  type="text" 
                  value={addrGstNo} 
                  onChange={(e) => setAddrGstNo(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. 07AAAAA1111A1Z1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile No.*</label>
                  <input 
                    type="text" 
                    required
                    value={addrMobile} 
                    onChange={(e) => setAddrMobile(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Id*</label>
                  <input 
                    type="email" 
                    required
                    value={addrEmail} 
                    onChange={(e) => setAddrEmail(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. office@domain.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowCompanyAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPANY ADDRESS SECURE DELETE WARNING */}
      {companyToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden">
            {companyDeleteStep === 1 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  Security Warning
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  You are attempting to delete Company Address <strong className="text-slate-800 font-bold">{companyToDelete.name}</strong>.
                  <br /><br />
                  This address record will be permanently deleted from the database and will not be available for future POs.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDeleteStep(0);
                      setCompanyToDelete(null);
                      setCompanyCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyDeleteStep(2)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Continue
                  </button>
                </div>
              </div>
            )}

            {companyDeleteStep === 2 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
                  Verification Required
                </h3>
                <p className="text-xs text-slate-600 mb-4 font-semibold">
                  To proceed, enter the verification code shown below:
                </p>
                
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-center mb-4">
                  <span className="font-mono font-extrabold text-2xl tracking-widest text-slate-700 select-none">
                    {companyCaptchaCode}
                  </span>
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    required
                    placeholder="Enter verification code"
                    value={companyCaptchaInput}
                    onChange={(e) => setCompanyCaptchaInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-red-500/20 focus:outline-none text-center font-mono font-bold text-sm tracking-widest text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDeleteStep(0);
                      setCompanyToDelete(null);
                      setCompanyCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (companyCaptchaInput.trim().toUpperCase() === companyCaptchaCode) {
                        setCompanyDeleteStep(3);
                      } else {
                        addToast({
                          type: "error",
                          title: "Invalid Code",
                          message: "The entered verification code did not match. Please try again."
                        });
                        setCompanyCaptchaCode(generateRandomCaptcha());
                        setCompanyCaptchaInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}

            {companyDeleteStep === 3 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider">
                  Final Confirmation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  Are you absolutely sure you want to delete <strong className="text-slate-800 font-bold">{companyToDelete.name}</strong>?
                  <br /><br />
                  This is the final confirmation. There is no undo.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyDeleteStep(0);
                      setCompanyToDelete(null);
                      setCompanyCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteCompanyConfirmed(companyToDelete.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DATABASE MANAGER FOR WAREHOUSE ADDRESSES */}
      {showWarehouseCrudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowWarehouseCrudModal(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Home size={18} className="text-forest-700" />
                  Manage Warehouse Addresses
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setAddrName("");
                    setAddrStreet("");
                    setAddrVillage("");
                    setAddrBlock("");
                    setAddrPinCode("");
                    setAddrState("");
                    setAddrDistrict("");
                    setAddrPlace("");
                    setAddrGstNo("");
                    setAddrMobile("");
                    setAddrEmail("");
                    setEditingWarehouseAddressId(null);
                    setShowWarehouseAddModal(true);
                  }}
                  className="px-3 py-1.5 bg-forest-700 text-white text-xs font-bold rounded-xl hover:bg-forest-800 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add New
                </button>
              </div>

              {/* List of current Warehouse Addresses */}
              <div className="overflow-y-auto max-h-[50vh] pr-1 space-y-2">
                {warehouseAddresses.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No Warehouse Addresses in database. Create one now!</p>
                ) : (
                  warehouseAddresses.map((w) => (
                    <div key={w.id} className="p-3 border border-slate-100 rounded-2xl flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-slate-800 text-sm">{w.name}</p>
                        <p className="text-slate-500 font-medium">GSTIN/PAN: {w.gstNo || "N/A"}</p>
                        <p className="text-slate-400 font-medium">{w.address}, {w.place}, {w.district}, {w.state} - {w.pinCode || ""}</p>
                        <p className="text-slate-400">Mobile: {w.mobile} | Email: {w.email || "N/A"}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingWarehouseAddressId(w.id);
                            setAddrName(w.name);
                            setAddrStreet(w.address);
                            setAddrVillage(w.village || "");
                            setAddrBlock(w.block || "");
                            setAddrPinCode(w.pinCode || "");
                            setAddrState(w.state);
                            setAddrDistrict(w.district);
                            setAddrPlace(w.place || "");
                            setAddrGstNo(w.gstNo || "");
                            setAddrMobile(w.mobile);
                            setAddrEmail(w.email || "");
                            setShowWarehouseAddModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-colors border"
                          title="Edit Details"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWarehouseAddress(w.id, w.name)}
                          className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                          title="Delete Address"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="border-t pt-3 mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowWarehouseCrudModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT WAREHOUSE ADDRESS FORM */}
      {showWarehouseAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowWarehouseAddModal(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
              {editingWarehouseAddressId ? "Edit Warehouse Address Details" : "Create New Warehouse Address"}
            </h3>
            
            <form onSubmit={handleSaveWarehouseAddress} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Warehouse Name*</label>
                <input 
                  type="text" 
                  required
                  value={addrName} 
                  onChange={(e) => setAddrName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. Delhi Warehouse"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Address Lines (Street / House No.)*</label>
                <input 
                  type="text" 
                  required
                  value={addrStreet} 
                  onChange={(e) => setAddrStreet(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. Plot 45, Industrial Area"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Place / City*</label>
                  <input 
                    type="text" 
                    required
                    value={addrPlace} 
                    onChange={(e) => setAddrPlace(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="Place/City Name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pin Code</label>
                  <input 
                    type="text" 
                    value={addrPinCode} 
                    onChange={(e) => setAddrPinCode(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="6-digit pin code"
                    maxLength={6}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">District*</label>
                  <input 
                    type="text" 
                    required
                    value={addrDistrict} 
                    onChange={(e) => setAddrDistrict(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="District"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">State*</label>
                  <input 
                    type="text" 
                    required
                    value={addrState} 
                    onChange={(e) => setAddrState(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="State"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">GSTIN/PAN No.</label>
                <input 
                  type="text" 
                  value={addrGstNo} 
                  onChange={(e) => setAddrGstNo(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                  placeholder="e.g. 07AAAAA1111A1Z1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile No.*</label>
                  <input 
                    type="text" 
                    required
                    value={addrMobile} 
                    onChange={(e) => setAddrMobile(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Id*</label>
                  <input 
                    type="email" 
                    required
                    value={addrEmail} 
                    onChange={(e) => setAddrEmail(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-forest-500/20 focus:outline-none" 
                    placeholder="e.g. warehouse@domain.com"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowWarehouseAddModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: WAREHOUSE ADDRESS SECURE DELETE WARNING */}
      {warehouseToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 overflow-hidden">
            {warehouseDeleteStep === 1 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={16} />
                  Security Warning
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  You are attempting to delete Warehouse Address <strong className="text-slate-800 font-bold">{warehouseToDelete.name}</strong>.
                  <br /><br />
                  This address record will be permanently deleted from the database and will not be available for future POs.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWarehouseDeleteStep(0);
                      setWarehouseToDelete(null);
                      setWarehouseCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarehouseDeleteStep(2)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Continue
                  </button>
                </div>
              </div>
            )}

            {warehouseDeleteStep === 2 && (
              <div>
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4 uppercase tracking-wider">
                  Verification Required
                </h3>
                <p className="text-xs text-slate-600 mb-4 font-semibold">
                  To proceed, enter the verification code shown below:
                </p>
                
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-center mb-4">
                  <span className="font-mono font-extrabold text-2xl tracking-widest text-slate-700 select-none">
                    {warehouseCaptchaCode}
                  </span>
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    required
                    placeholder="Enter verification code"
                    value={warehouseCaptchaInput}
                    onChange={(e) => setWarehouseCaptchaInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-[#f5f5f7] focus:ring-2 focus:ring-red-500/20 focus:outline-none text-center font-mono font-bold text-sm tracking-widest text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWarehouseDeleteStep(0);
                      setWarehouseToDelete(null);
                      setWarehouseCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (warehouseCaptchaInput.trim().toUpperCase() === warehouseCaptchaCode) {
                        setWarehouseDeleteStep(3);
                      } else {
                        addToast({
                          type: "error",
                          title: "Invalid Code",
                          message: "The entered verification code did not match. Please try again."
                        });
                        setWarehouseCaptchaCode(generateRandomCaptcha());
                        setWarehouseCaptchaInput("");
                      }
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}

            {warehouseDeleteStep === 3 && (
              <div>
                <h3 className="text-sm font-bold text-red-600 border-b border-red-100 pb-3 mb-4 uppercase tracking-wider">
                  Final Confirmation
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-6 font-semibold">
                  Are you absolutely sure you want to delete <strong className="text-slate-800 font-bold">{warehouseToDelete.name}</strong>?
                  <br /><br />
                  This is the final confirmation. There is no undo.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWarehouseDeleteStep(0);
                      setWarehouseToDelete(null);
                      setWarehouseCaptchaInput("");
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteWarehouseConfirmed(warehouseToDelete.id);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default function POMakerPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center py-20"><Loader2 className="animate-spin text-forest-500 w-8 h-8" /></div>}>
      <POMakerForm />
    </Suspense>
  );
}
