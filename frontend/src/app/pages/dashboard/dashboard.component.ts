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

  constructor(private api: ApiService) {}

  async ngOnInit() {
    await this.load();
  }

  async load() {
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
