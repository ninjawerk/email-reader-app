import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CategoryComponent } from './category.component';

describe('CategoryComponent', () => {
  let component: CategoryComponent;
  let fixture: ComponentFixture<CategoryComponent>;

  beforeEach(() => {
    const apiMock = {
      listAccounts: jest.fn(async () => ([{ _id: 'a1' }])),
      listCategories: jest.fn(async () => ([{ _id: 'c1', name: 'News' }])),
      listEmails: jest.fn(async () => ({ items: [{ _id: 'e1' }], total: 25, page: 1, pageSize: 20 })),
      getEmail: jest.fn(async (id: string) => ({ _id: id, subject: 'S' })),
      bulkDelete: jest.fn(async () => ({})),
      bulkUnsubscribe: jest.fn(async () => ({})),
    } as any;

    TestBed.configureTestingModule({
      declarations: [CategoryComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'c1' } } } },
        { provide: ApiService, useValue: apiMock },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    });
    fixture = TestBed.createComponent(CategoryComponent);
    component = fixture.componentInstance as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads paginated emails and focuses first', async () => {
    await component.ngOnInit();
    expect(component.emails.length).toBe(1);
    expect(component.total).toBe(25);
    expect(component.page).toBe(1);
    expect(component.focusedEmail?._id).toBe('e1');
  });

  it('navigates pages using next/prev', async () => {
    const api = TestBed.inject(ApiService) as any;
    await component.ngOnInit();
    (api.listEmails as jest.Mock).mockResolvedValueOnce({ items: [{ _id: 'e2' }], total: 25, page: 2, pageSize: 20 });
    await component.nextPage();
    expect(api.listEmails).toHaveBeenCalledWith({ categoryId: 'c1', page: 2, pageSize: 20 });
    expect(component.page).toBe(2);
  });

  it('toggleAll selects and deselects', async () => {
    await component.ngOnInit();
    component.toggleAll(true);
    expect(component.selected['e1']).toBe(true);
    component.toggleAll(false);
    expect(component.selected['e1']).toBe(false);
  });

  it('openEmail loads full email', async () => {
    await component.ngOnInit();
    await component.openEmail({ _id: 'e1' });
    expect(component.focusedEmail?.subject).toBe('S');
  });
});
