"use client";

import { useState, useEffect, Suspense, useTransition, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  getPOBySlipId, 
  savePO, 
  getApprovedProcurementsByAdhatiya, 
  getAdhatiyas, 
  saveAdhatiya, 
  deleteAdhatiya 
} from "@/app/actions/po";
import { 
  FileText, Search, Plus, Trash2, Save, Printer, Loader2, Users, PlusCircle, Building, Settings, Check, HelpCircle, ChevronDown, ChevronRight, MapPin, Truck, Receipt
} from "lucide-react";
import { useToast } from "@/components/Toast";
import LoadingSkeleton from "./loading";
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
  const [poStatus, setPoStatus] = useState("SAVED");

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
    email: ""
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

  // Load initial slip if passed in URL
  useEffect(() => {
    if (initialSlipId) {
      fetchPO(initialSlipId);
    }
    loadAdhatiyas();
  }, [initialSlipId]);

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
            email: ""
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
      email: adhatiya.email
    });

    // Fetch slips for this Adhatiya
    fetchSlipsForAdhatiya(adhatiya.name);
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
        setVendor({ name: "", address: "", gstNo: "", mobile: "", email: "" });
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
          const overriddenBags = slipOverrides[s.slipId];
          if (overriddenBags !== undefined) {
            const bags = Math.max(0, Math.min(s.remainingBags || s.bags, overriddenBags));
            const baseRemainingBags = s.remainingBags || s.bags || 1;
            const baseRemainingQty = s.remainingQty !== undefined ? s.remainingQty : s.netQuantity;
            const qty = Math.max(0, Math.round((baseRemainingQty / baseRemainingBags) * bags * 100) / 100);
            const total = Math.round((qty * s.rate) * 100) / 100;
            return { ...s, bags, netQuantity: qty, total };
          }
          return s;
        }) 
      : (originalProcurement ? [originalProcurement] : []);

    let totalBags = 0;
    let totalQty = 0;
    let totalSubtotal = 0;

    activeSlips.forEach(slip => {
      totalBags += slip.bags || 0;
      totalQty += slip.netQuantity || 0;
      totalSubtotal += (slip.netQuantity || 0) * (slip.rate || 0);
    });

    // Handle overrides for single-item PO or bags override
    if (activeSlips.length === 1 && originalProcurement) {
      const netQty = manualNetQty !== "" ? Number(manualNetQty) : totalQty;
      const rate = manualRate !== "" ? Number(manualRate) : (originalProcurement.rate || 0);
      totalQty = netQty;
      totalSubtotal = netQty * rate;
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
  }, [procurementSlips, selectedSlipIds, originalProcurement, poBags, manualNetQty, manualRate, rates, overrides, slipOverrides]);

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

        {/* Adhatiya procurement slips list (Multi-Select) */}
        {procurementSlips.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Select Slips under &quot;{adhatiyaSearch}&quot;
              </h3>
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
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {procurementSlips.map((slip) => {
                const isChecked = selectedSlipIds.has(slip.slipId);
                return (
                  <label
                    key={slip.slipId}
                    className={`flex items-start gap-3 p-2.5 border rounded-xl cursor-pointer hover:bg-slate-50 transition-all ${isChecked ? "border-forest-500 bg-forest-50/20" : "border-slate-100"}`}
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
                      className="mt-1 w-4 h-4 accent-forest-700 shrink-0 rounded"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold text-slate-800">
                        {slip.farmerName} <span className="text-[9px] font-normal text-slate-400">({slip.farmerCode})</span>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {slip.crop} {slip.variety} • {slip.bags} Bags • {slip.netQuantity} Qtl
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 mt-0.5">{slip.slipId}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 self-center tabular-nums">
                      ₹{slip.total?.toLocaleString("en-IN")}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              * Checking these slips dynamically includes/excludes them as rows in the PO below.
            </p>
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
                    openAddressSection === "vendor" ? "bg-forest-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "vendor" ? "bg-forest-100 text-forest-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Building size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vendor / Seller</span>
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
                    openAddressSection === "billing" ? "bg-blue-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "billing" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Receipt size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Billing Address</span>
                      {openAddressSection !== "billing" && billing.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{billing.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${openAddressSection === "billing" ? "rotate-180" : ""}`} />
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${openAddressSection === "billing" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-4 pt-3 space-y-3 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Billing Name</label>
                      <input type="text" value={billing.name} onChange={(e) => setBilling({ ...billing, name: e.target.value })} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address Lines</label>
                      <textarea value={billing.address} rows={4} onChange={(e) => setBilling({ ...billing, address: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">GST/PAN No.</label>
                        <input type="text" value={billing.gstNo} onChange={(e) => setBilling({ ...billing, gstNo: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile No.</label>
                        <input type="text" value={billing.mobile} onChange={(e) => setBilling({ ...billing, mobile: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Id</label>
                        <input type="text" value={billing.email} onChange={(e) => setBilling({ ...billing, email: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3. Delivery Address ── */}
                <button
                  type="button"
                  onClick={() => setOpenAddressSection(openAddressSection === "delivery" ? null : "delivery")}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left border-t border-slate-100 transition-colors ${
                    openAddressSection === "delivery" ? "bg-amber-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      openAddressSection === "delivery" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      <Truck size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Delivery Address</span>
                      {openAddressSection !== "delivery" && delivery.name && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{delivery.name}</p>
                      )}
                    </div>
                  </div>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${openAddressSection === "delivery" ? "rotate-180" : ""}`} />
                </button>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden ${openAddressSection === "delivery" ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-4 pt-3 space-y-3 border-t border-slate-100">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Delivery Name</label>
                      <input type="text" value={delivery.name} onChange={(e) => setDelivery({ ...delivery, name: e.target.value })} className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Address Lines</label>
                      <textarea value={delivery.address} rows={4} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">GST/PAN No.</label>
                        <input type="text" value={delivery.gstNo} onChange={(e) => setDelivery({ ...delivery, gstNo: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                    </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mobile No.</label>
                        <input type="text" value={delivery.mobile} onChange={(e) => setDelivery({ ...delivery, mobile: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Email Id</label>
                        <input type="text" value={delivery.email} onChange={(e) => setDelivery({ ...delivery, email: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-[#f5f5f7] focus:bg-white focus:border-forest-500 focus:ring-2 focus:ring-forest-500/20 focus:outline-none transition-all" />
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

            {/* Desktop Actions */}
            <div className="hidden xl:flex pt-4 pb-12 justify-end gap-3">
            {poStatus === "BILLED" && (
              <button 
                onClick={handlePrint} 
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all bg-white shadow-sm"
              >
                <Printer size={18} /> Print PO
              </button>
            )}
            <button 
                onClick={handleSave} 
                disabled={saving} 
                className="px-6 py-2.5 bg-forest-800 text-white font-semibold rounded-xl hover:bg-forest-700 active:bg-forest-900 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                {saving ? "Saving..." : "Save PO"}
              </button>
            </div>

          </div>
        )}
      </div>

      {/* RIGHT COLUMN: A4 PORTRAIT PREVIEW */}
      <div className={`w-full xl:w-[55%] h-full xl:max-h-screen xl:overflow-y-auto overflow-x-auto print:overflow-visible print:h-auto print:max-h-none bg-slate-300/60 flex flex-col xl:items-center py-8 print:p-0 print:bg-white print:w-full print:block pb-40 xl:pb-8 ${mobileTab === 'edit' && (calcs.activeSlips.length > 0 || originalProcurement) ? 'hidden xl:flex' : 'flex'}`}>
        
        {loading ? (
          <div className="w-[210mm] min-h-[297mm] mx-auto bg-white rounded-xl shadow-2xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 size={36} className="animate-spin text-forest-600" />
              <p className="text-sm font-semibold">Generating live preview...</p>
            </div>
          </div>
        ) : calcs.activeSlips.length > 0 || originalProcurement ? (
          <div id="printable-po" className="w-[210mm] min-w-[210mm] mx-auto bg-white text-black shadow-2xl print:shadow-none p-6 print:p-0 text-[11px] leading-tight transform origin-top xl:scale-[0.8] 2xl:scale-95 print:scale-100 print:transform-none transition-transform font-sans">
            
            <style>{`
              @media print {
                @page { size: A4 portrait; margin: 8mm; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white !important; }
                body * { visibility: hidden; }
                #printable-po, #printable-po * { visibility: visible; }
                #printable-po {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  transform: none !important;
                  box-shadow: none !important;
                  border: none !important;
                  background: white !important;
                }
                .print-hide, .print-hide * {
                  visibility: hidden !important;
                  display: none !important;
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

            <div className="po-grid-border flex flex-col min-h-[268mm] justify-between">
              <div>
                
                {/* 1. LOGO & HEADER ROW */}
                <div className="flex po-cell-border-b h-16 items-center bg-slate-50/10">
                  <div className="w-[20%] po-cell-border-r h-full flex items-center justify-center p-2">
                    {/* FARMER ERP LOGO */}
                    <div className="flex items-center gap-1.5 select-none">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm leading-tight p-1">
                        FARMER<br/>ERP
                      </div>
                      <div className="text-left leading-tight">
                        <span className="text-[9px] font-black text-slate-800 tracking-tight block">FARMER ERP</span>
                        <span className="text-[6.5px] font-bold text-emerald-600 tracking-wider block">Pvt Ltd</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-[60%] text-center">
                    <h1 className="text-lg font-black tracking-widest uppercase text-slate-800">PURCHASE ORDER</h1>
                    <h2 className="text-xs font-bold uppercase text-slate-600">{billing.name || "Farmer ERP Pvt Ltd"}</h2>
                  </div>
                  <div className="w-[20%] border-l-[1.5px] border-black h-full flex items-center justify-center p-1 print-hide">
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

                {/* 2. VENDOR & METADATA GRID */}
                <div className="flex po-cell-border-b">
                  
                  {/* Left Column: Vendor Address block */}
                  <div className="w-1/2 po-cell-border-r p-2 space-y-1">
                    <p className="font-bold underline uppercase text-xs text-slate-700">Vender:</p>
                    <p className="font-black text-sm uppercase">{vendor.name || "ABC PVT LTD"}</p>
                    <p className="uppercase leading-tight text-xs whitespace-pre-wrap font-medium">{vendor.address || "123, Kisan Market, Near Railway Station\nSector-12, Gandhinagar, Gujarat - 382010"}</p>
                    <div className="pt-0.5 space-y-0.5 text-xs">
                      <p><span className="font-bold">GST/PAN No.:</span> {vendor.gstNo || "24ABCDE1234F1Z5"}</p>
                      <p><span className="font-bold">Mobile no.:</span> {vendor.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-bold">Email Id:</span> {vendor.email || "vendor@example.com"}</p>
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
                    
                    <div className="p-2 space-y-1 flex-1 flex flex-col justify-center text-xs">
                      <p><span className="font-bold">Payment Terms:</span> {paymentTerms}</p>
                      <p><span className="font-bold">DELIVERY:</span> {deliveryTerms || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* 3. BILLING & DELIVERY ADDRESS ROW */}
                <div className="flex po-cell-border-b h-24">
                  {/* Billing Address */}
                  <div className="w-1/2 po-cell-border-r p-2 space-y-0.5">
                    <p className="font-bold underline text-xs text-slate-700">Billing Address:</p>
                    <p className="font-bold uppercase text-xs">{billing.name || "Farmer ERP Pvt Ltd"}</p>
                    <p className="uppercase leading-none text-xs whitespace-pre-wrap font-medium">{billing.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                    <div className="text-xs pt-1 font-medium text-slate-700">
                      <p><span className="font-semibold">GST/PAN:</span> {billing.gstNo || "24AAACF1234A1Z5"}</p>
                      <p><span className="font-semibold">Mobile:</span> {billing.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-semibold">Email:</span> {billing.email || "contact@farmererp.com"}</p>
                    </div>
                  </div>
                  
                  {/* Delivery Address */}
                  <div className="w-1/2 p-2 space-y-0.5">
                    <p className="font-bold underline text-xs text-slate-700">Delivery Address:</p>
                    <p className="font-bold uppercase text-xs">{delivery.name || "Farmer ERP Pvt Ltd"}</p>
                    <p className="uppercase leading-none text-xs whitespace-pre-wrap font-medium">{delivery.address || "12, Krishi Bhawan Complex, Sector 4\nGandhinagar, Gujarat - 382010"}</p>
                    <div className="text-xs pt-1 font-medium text-slate-700">
                      <p><span className="font-semibold">GST/PAN:</span> {delivery.gstNo || "24AAACF1234A1Z5"}</p>
                      <p><span className="font-semibold">Mobile:</span> {delivery.mobile || "+91 98765 43210"}</p>
                      <p><span className="font-semibold">Email:</span> {delivery.email || "contact@farmererp.com"}</p>
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
                  <span className="font-bold">Total amount in words:</span> <span className="font-semibold uppercase text-slate-800 ml-1 text-xs">{numberToWords(calcs.finalAmount)}</span>
                </div>

                <div className="flex min-h-28">
                  {/* Left Side: Terms and Conditions */}
                  <div className="w-[65%] po-cell-border-r p-2 space-y-1 text-xs">
                    <p className="font-bold text-slate-700">Terms & Conditions :</p>
                    <p className="uppercase leading-normal font-medium text-slate-600 whitespace-pre-wrap">{termsAndConditions}</p>
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
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full bg-white max-w-[210mm] w-full mx-auto rounded-xl">
            <FileText size={48} className="mb-4 opacity-30 text-forest-700" />
            <p className="font-semibold text-slate-700 text-sm">Select an Adhatiya or Fetch a Slip ID to begin</p>
            <p className="text-xs text-slate-500 text-center max-w-sm mt-1">
              Select an agent from the database to load their vendor coordinates and check matching procurements.
            </p>
          </div>
        )}
      </div>

      {/* MOBILE STICKY ACTION BAR */}
      {(calcs.activeSlips.length > 0 || originalProcurement) && (
        <div className="xl:hidden fixed bottom-[52px] left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.1)] z-50 flex justify-between gap-3 print:hidden">
          {poStatus === "BILLED" && (
            <button 
              onClick={handlePrint} 
              className="flex-1 justify-center px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all bg-white shadow-sm"
            >
              <Printer size={18} /> Print PO
            </button>
          )}
          <button 
            onClick={handleSave} 
            disabled={saving} 
            className="flex-1 justify-center px-4 py-3 bg-forest-800 text-white font-semibold rounded-xl hover:bg-forest-700 active:bg-forest-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
            {saving ? "Saving..." : "Save PO"}
          </button>
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

    </div>
  );
}

export default function POMakerPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <POMakerForm />
    </Suspense>
  );
}
