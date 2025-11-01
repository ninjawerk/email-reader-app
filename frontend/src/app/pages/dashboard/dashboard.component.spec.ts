import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { ApiService } from '../../services/api.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(() => {
    const apiMock = {
      loginUrl: jest.fn(() => '/auth/google'),
      listAccounts: jest.fn(async () => ([{ _id: 'a1' }])),
      me: jest.fn(async () => ({ authenticated: true })),
      listCategories: jest.fn(async () => ([{ _id: 'c1', name: 'General' }])),
      createCategory: jest.fn(async () => ({}))
    } as any;

    TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      providers: [ { provide: ApiService, useValue: apiMock } ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads accounts and categories on init', async () => {
    await component.ngOnInit();
    expect(component.hasAccounts).toBe(true);
    expect(component.categories.length).toBe(1);
    expect(component.isLoading).toBe(false);
  });

  it('createCategory resets inputs and reloads', async () => {
    await component.ngOnInit();
    component.newName = 'New';
    component.newDescription = 'D';
    await component.createCategory({ preventDefault: () => {} } as any);
    expect(component.newName).toBe('');
    expect(component.newDescription).toBe('');
  });
});
