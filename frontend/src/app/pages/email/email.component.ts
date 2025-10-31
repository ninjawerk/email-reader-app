import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { colorFromString } from '../../utils/color.util';

@Component({
  selector: 'app-email',
  templateUrl: './email.component.html',
  styleUrls: ['./email.component.scss']
})
export class EmailComponent implements OnInit {
  email: any;
  constructor(private route: ActivatedRoute, private api: ApiService, private router: Router) {}

  async ngOnInit() {
    const accounts = await this.api.listAccounts();
    if (!accounts || accounts.length === 0) {
      this.router.navigateByUrl('/accounts');
      return;
    }
    const id = this.route.snapshot.paramMap.get('id')!;
    this.email = await this.api.getEmail(id);
  }

  colorFor(email: string) {
    return colorFromString(email || '');
  }
}
