import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  categories: any[] = [];
  newName = '';
  newDescription = '';
  accounts: any[] = [];
  hasAccounts = false;
  isLoading = true;
  connectHref = this.api.loginUrl();

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await this.loadAccounts();
    await this.load();
    this.isLoading = false;
  }

  async loadAccounts() {
    try {
      this.accounts = await this.api.listAccounts();
      this.hasAccounts = (this.accounts || []).length > 0;
    } catch {
      this.accounts = [];
      this.hasAccounts = false;
    }
  }

  async load() {
    if (!this.hasAccounts) {
      this.categories = [];
      return;
    }
    const me = await this.api.me();
    if (!me.authenticated) return;
    this.categories = await this.api.listCategories();
  }

  async createCategory(ev: Event) {
    ev.preventDefault();
    if (!this.newName) return;
    await this.api.createCategory({ name: this.newName, description: this.newDescription });
    this.newName = '';
    this.newDescription = '';
    await this.load();
  }
}
