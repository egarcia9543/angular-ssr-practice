import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CharactersPage } from './characters-page';

describe('CharactersPage', () => {
  let component: CharactersPage;
  let fixture: ComponentFixture<CharactersPage>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CharactersPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CharactersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
