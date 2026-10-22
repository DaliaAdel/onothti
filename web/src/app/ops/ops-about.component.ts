import { Component } from '@angular/core';
import { PlatformAboutComponent } from '../shared/platform-about.component';

@Component({
  selector: 'app-ops-about',
  imports: [PlatformAboutComponent],
  template: '<app-platform-about />',
})
export class OpsAboutComponent {}
