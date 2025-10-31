import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-email',
  templateUrl: './email.component.html',
  styleUrls: ['./email.component.scss']
})
export class EmailComponent implements OnInit {
  email: any;
  constructor(private route: ActivatedRoute, private api: ApiService) {}

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.email = await this.api.getEmail(id);
  }
}
