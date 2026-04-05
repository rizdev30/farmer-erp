// Dolibarr REST API Wrapper
// All calls go through Server Actions — never exposed to the client

export interface DolibarrThirdParty {
  id?: number;
  name: string;
  phone?: string;
  address?: string;
  town?: string;
  status?: number;
  client?: number;
  fournisseur?: number; // 1 = supplier
  array_options?: {
    options_district?: string;
    options_block?: string;
    options_father_name?: string;
    options_farmer_code?: string;
    options_village?: string;
  };
}

export interface DolibarrInvoiceLine {
  fk_product?: number;
  label: string;
  description: string;
  qty: number;
  subprice: number;
  tva_tx?: number;
}

export interface DolibarrSupplierInvoice {
  socid: number;
  type?: number;
  label?: string;
  ref_supplier?: string;
  lines?: DolibarrInvoiceLine[];
}

class DolibarrClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.DOLIBARR_URL || "http://localhost:8080";
    this.apiKey = process.env.DOLIBARR_API_KEY || "";
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      body?: unknown;
      params?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = "GET", body, params } = options;

    let url = `${this.baseUrl}/api/index.php${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }

    const headers: Record<string, string> = {
      DOLAPIKEY: this.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Unknown error");
      throw new Error(
        `Dolibarr API Error [${res.status}] ${endpoint}: ${errorText}`
      );
    }

    return res.json();
  }

  // === Third Parties (Farmers) ===

  async getThirdParties(filters?: {
    sqlfilters?: string;
    sortfield?: string;
    sortorder?: string;
    limit?: string;
    page?: string;
  }): Promise<DolibarrThirdParty[]> {
    try {
      return await this.request<DolibarrThirdParty[]>("/thirdparties", {
        params: {
          mode: "4", // suppliers only
          ...filters,
        },
      });
    } catch {
      return [];
    }
  }

  async searchThirdParties(query: string): Promise<DolibarrThirdParty[]> {
    if (!query || query.length < 2) return [];
    try {
      return await this.request<DolibarrThirdParty[]>("/thirdparties", {
        params: {
          mode: "4",
          sqlfilters: `(t.nom:like:'%${query}%')`,
          limit: "20",
        },
      });
    } catch {
      return [];
    }
  }

  async getThirdParty(id: number): Promise<DolibarrThirdParty> {
    return this.request<DolibarrThirdParty>(`/thirdparties/${id}`);
  }

  async createThirdParty(data: {
    name: string;
    phone?: string;
    address?: string;
    town?: string;
    district?: string;
    block?: string;
    fatherName?: string;
    farmerCode?: string;
    village?: string;
  }): Promise<number> {
    const payload: DolibarrThirdParty = {
      name: data.name,
      phone: data.phone || "",
      address: data.address || "",
      town: data.town || "",
      status: 1,
      client: 0,
      fournisseur: 1, // Mark as supplier
      array_options: {
        options_district: data.district || "",
        options_block: data.block || "",
        options_father_name: data.fatherName || "",
        options_farmer_code: data.farmerCode || "",
        options_village: data.village || "",
      },
    };

    return this.request<number>("/thirdparties", {
      method: "POST",
      body: payload,
    });
  }

  // === Supplier Invoices (Procurement) ===

  async createSupplierInvoice(
    data: DolibarrSupplierInvoice
  ): Promise<number> {
    return this.request<number>("/supplierinvoices", {
      method: "POST",
      body: {
        ...data,
        type: 0,
      },
    });
  }

  async addInvoiceLine(
    invoiceId: number,
    line: DolibarrInvoiceLine
  ): Promise<number> {
    return this.request<number>(`/supplierinvoices/${invoiceId}/lines`, {
      method: "POST",
      body: {
        ...line,
        tva_tx: line.tva_tx || 0,
      },
    });
  }

  async validateInvoice(invoiceId: number): Promise<number> {
    return this.request<number>(
      `/supplierinvoices/${invoiceId}/validate`,
      { method: "POST", body: { notrigger: 0 } }
    );
  }

  async getSupplierInvoices(filters?: {
    sqlfilters?: string;
    limit?: string;
    sortfield?: string;
    sortorder?: string;
  }): Promise<unknown[]> {
    try {
      return await this.request<unknown[]>("/supplierinvoices", {
        params: {
          sortfield: "t.datec",
          sortorder: "DESC",
          limit: "50",
          ...filters,
        },
      });
    } catch {
      return [];
    }
  }
}

// Singleton instance
const dolibarr = new DolibarrClient();
export default dolibarr;
