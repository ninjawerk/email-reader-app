import { Injectable } from '@angular/core';
import axios from 'axios';

declare global {
  interface Window { __APP_CONFIG?: { API_BASE?: string; AUTH_BASE?: string } }
}

const API_BASE = (window.__APP_CONFIG?.API_BASE && window.__APP_CONFIG.API_BASE.length > 0)
  ? window.__APP_CONFIG.API_BASE
  : '/api';
const AUTH_BASE = (window.__APP_CONFIG?.AUTH_BASE && window.__APP_CONFIG.AUTH_BASE.length > 0)
  ? window.__APP_CONFIG.AUTH_BASE
  : '/auth';

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

  async listEmails(categoryId?: string) {
    const r = await axios.get(`${API_BASE}/emails`, { params: { categoryId } });
    return r.data;
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
