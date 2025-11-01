import { Injectable } from '@angular/core';
import axios from 'axios';

declare global {
  interface Window { __APP_CONFIG?: { API_BASE?: string; AUTH_BASE?: string } }
}

function resolveBase(defaultPath: string, devFallback: string): string {
  const cfg = window.__APP_CONFIG;
  if (cfg) {
    const v = defaultPath.includes('auth') ? cfg.AUTH_BASE : cfg.API_BASE;
    if (v && v.length > 0) return v;
  }
  // Dev server fallback: Angular on 4200, backend on 3000
  if (location.host.includes('localhost:4200')) {
    return devFallback;
  }
  // Same-origin relative in production
  return defaultPath;
}

const API_BASE = resolveBase('/api', 'http://localhost:3000/api');
const AUTH_BASE = resolveBase('/auth', 'http://localhost:3000/auth');

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor() {
    axios.defaults.withCredentials = true;
  }

  async me() {
    const r = await axios.get(`${AUTH_BASE}/me`);
    return r.data;
  }

  loginUrl() {
    return `${AUTH_BASE}/google`;
  }

  async logout() {
    const r = await axios.post(`${AUTH_BASE}/logout`);
    return r.data;
  }

  async listAccounts() {
    const r = await axios.get(`${API_BASE}/accounts`);
    return r.data;
  }

  async disconnectAccount(accountId: string) {
    const r = await axios.delete(`${API_BASE}/accounts/${accountId}`);
    return r.data;
  }

  async listCategories() {
    const r = await axios.get(`${API_BASE}/categories`);
    return r.data;
  }

  async createCategory(payload: { name: string; description: string }) {
    const r = await axios.post(`${API_BASE}/categories`, payload);
    return r.data;
  }

  async listEmails(opts?: { categoryId?: string; page?: number; pageSize?: number }) {
    const params: any = {};
    if (opts?.categoryId) params.categoryId = opts.categoryId;
    if (opts?.page) params.page = opts.page;
    if (opts?.pageSize) params.pageSize = opts.pageSize;
    const r = await axios.get(`${API_BASE}/emails`, { params });
    return r.data as { items: any[]; total: number; page: number; pageSize: number } | any[];
  }

  async getEmail(id: string) {
    const r = await axios.get(`${API_BASE}/emails/${id}`);
    return r.data;
  }

  async bulkDelete(emailIds: string[]) {
    const r = await axios.post(`${API_BASE}/emails/bulk-delete`, { emailIds });
    return r.data;
  }

  async bulkUnsubscribe(emailIds: string[]) {
    const r = await axios.post(`${API_BASE}/emails/bulk-unsubscribe`, { emailIds });
    return r.data;
  }
}
