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
    this.emails = await this.api.listEmails(this.categoryId);
    this.selected = {};
    if (this.emails.length) {
      this.focusedEmail = await this.api.getEmail(this.emails[0]._id);
    } else {
      this.focusedEmail = null;
    }
  }

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
