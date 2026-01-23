import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductsSkeleton } from './products-skeleton';

describe('ProductsSkeleton', () => {
  let component: ProductsSkeleton;
  let fixture: ComponentFixture<ProductsSkeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsSkeleton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductsSkeleton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
