import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InqueriesComponent } from './inqueries.component';

describe('InqueriesComponent', () => {
  let component: InqueriesComponent;
  let fixture: ComponentFixture<InqueriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InqueriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InqueriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
