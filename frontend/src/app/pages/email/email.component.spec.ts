import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { EmailComponent } from './email.component';

describe('EmailComponent', () => {
  let component: EmailComponent;
  let fixture: ComponentFixture<EmailComponent>;

  beforeEach(() => {
    const apiMock = {
      listAccounts: jest.fn(async () => ([{ _id: 'a1' }])),
      getEmail: jest.fn(async () => ({ _id: 'e1', subject: 'Hello' }))
    } as any;

    TestBed.configureTestingModule({
      declarations: [EmailComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'e1' } } } },
        { provide: ApiService, useValue: apiMock },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(EmailComponent);
    component = fixture.componentInstance as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads email when accounts exist', async () => {
    await component.ngOnInit();
    expect(component.email?._id).toBe('e1');
  });
});
