import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-category',
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent implements OnInit {
  categoryId!: string;
  emails: any[] = [];
  selected: Record<string, boolean> = {};

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    this.categoryId = this.route.snapshot.paramMap.get('id')!;
    await this.load();
  }

  async load() {
    this.emails = await this.api.listEmails(this.categoryId);
    this.selected = {};
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
}
