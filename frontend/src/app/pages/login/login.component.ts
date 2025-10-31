import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginUrl = this.api.loginUrl();
  constructor(private api: ApiService, private router: Router) {}

  async ngOnInit() {
    const me = await this.api.me();
    if (me.authenticated) {
      this.router.navigateByUrl('/');
    }
  }
}
