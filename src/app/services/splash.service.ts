import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SplashService {
  private splashVisible = new BehaviorSubject<boolean>(true);
  
  public splashVisible$ = this.splashVisible.asObservable();
  
  hideSplash() {
    this.splashVisible.next(false);
  }
  
  showSplash() {
    this.splashVisible.next(true);
  }
  
  isSplashVisible(): boolean {
    return this.splashVisible.value;
  }
}
