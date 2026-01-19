import { TestBed } from '@angular/core/testing';

import { MetatagsGenerator } from './metatags-generator';

describe('MetatagsGenerator', () => {
  let service: MetatagsGenerator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetatagsGenerator);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
