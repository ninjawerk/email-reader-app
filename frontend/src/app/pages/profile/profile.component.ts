import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  me: any;

  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit() {
    this.me = await this.api.me();
    if (!this.me?.authenticated) {
      this.router.navigateByUrl('/login');
    }
  }

  async logout() {
    await this.api.logout();
    this.router.navigateByUrl('/login');
  }
}
