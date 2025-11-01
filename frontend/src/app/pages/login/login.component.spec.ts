import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(() => {
    const apiMock = { me: jest.fn(async () => ({ authenticated: true })), loginUrl: jest.fn(() => '/auth/google') } as any;
    TestBed.configureTestingModule({
      declarations: [LoginComponent],
      imports: [RouterTestingModule],
      providers: [ { provide: ApiService, useValue: apiMock } ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates away when already authenticated', async () => {
    const router = TestBed.inject(Router);
    const routerSpy = jest.spyOn(router, 'navigateByUrl');
    await component.ngOnInit();
    expect(routerSpy).toHaveBeenCalledWith('/');
  });
});
