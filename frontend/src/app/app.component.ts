import { Component, OnInit } from '@angular/core';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  me: any;
  isLoadingMe = true;
  loginHref = this.api.loginUrl();

  constructor(private api: ApiService) {}

  async ngOnInit() {
    try {
      this.me = await this.api.me();
    } catch {}
    this.isLoadingMe = false;
  }
}
