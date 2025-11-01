import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { colorFromString } from '../../utils/color.util';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categoryId!: string;
  categoryName = '';
  emails: any[] = [];
  total = 0;
  page = 1;
  pageSize = 20;
  selected: Record<string, boolean> = {};
  focusedEmail: any | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) {}

  async ngOnInit() {
    this.categoryId = this.route.snapshot.paramMap.get('id')!;
    const accounts = await this.api.listAccounts();
    if (!accounts || accounts.length === 0) {
      this.router.navigateByUrl('/accounts');
      return;
    }
    await this.loadCategoryName();
    await this.load();
  }

  colorFor(email: string) {
    return colorFromString(email || '');
  }

  async loadCategoryName() {
    try {
      const cats = await this.api.listCategories();
      const c = cats.find((x: any) => x._id === this.categoryId);
      this.categoryName = c ? c.name : '';
    } catch {}
  }

  async load() {
    const data = await this.api.listEmails({ categoryId: this.categoryId, page: this.page, pageSize: this.pageSize });
    if (Array.isArray(data)) {
      // Backward compatibility if server returns array
      this.emails = data;
      this.total = data.length;
    } else {
      this.emails = data.items || [];
      this.total = data.total || 0;
      this.page = data.page || 1;
      this.pageSize = data.pageSize || this.pageSize;
    }
    this.selected = {};
    if (this.emails.length) {
      this.focusedEmail = await this.api.getEmail(this.emails[0]._id);
    } else {
      this.focusedEmail = null;
    }
  }

  totalPages() {
    return Math.max(Math.ceil(this.total / this.pageSize), 1);
  }

  async goToPage(p: number) {
    const tp = this.totalPages();
    this.page = Math.min(Math.max(1, p), tp);
    await this.load();
  }

  async nextPage() { await this.goToPage(this.page + 1); }
  async prevPage() { await this.goToPage(this.page - 1); }

  idsSelected() {
    return this.emails.filter(e => this.selected[e._id]).map(e => e._id);
  }

  async bulkDelete() {
    const ids = this.idsSelected();
    if (!ids.length) return;
    await this.api.bulkDelete(ids);
    await this.load();
  }

  async bulkUnsubscribe() {
    const ids = this.idsSelected();
    if (!ids.length) return;
    await this.api.bulkUnsubscribe(ids);
    await this.load();
  }

  toggleAll(checked: boolean | undefined) {
    const v = !!checked;
    this.emails.forEach(e => this.selected[e._id] = v);
  }

  async openEmail(e: any) {
    this.focusedEmail = await this.api.getEmail(e._id);
  }
}
