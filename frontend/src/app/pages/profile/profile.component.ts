import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { colorFromString } from '../../utils/color.util';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  me: any;
  accounts: any[] = [];
  connectHref = this.api.loginUrl();

  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit() {
    this.me = await this.api.me();
    if (!this.me?.authenticated) {
      this.router.navigateByUrl('/login');
      return;
    }
    await this.loadAccounts();
  }

  colorFor(email: string) {
    return colorFromString(email || '');
  }

  async loadAccounts() {
    this.accounts = await this.api.listAccounts();
  }

  async disconnect(id: string) {
    await this.api.disconnectAccount(id);
    await this.loadAccounts();
  }

  async logout() {
    await this.api.logout();
    this.router.navigateByUrl('/login');
  }
}
