import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmptyContent } from './empty-content';

describe('EmptyContent', () => {
  let component: EmptyContent;
  let fixture: ComponentFixture<EmptyContent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyContent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmptyContent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
