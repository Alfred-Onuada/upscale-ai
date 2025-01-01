import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { UpscaleWsService } from '../services/upscale-ws.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  imagePreview = '';
  upscaledImagePreview = '';

  @ViewChild('toastContainer') toastContainer!: ElementRef;
  @ViewChild('toastSuccessSample') toastSuccessSample!: ElementRef;
  @ViewChild('toastErrorSample') toastErrorSample!: ElementRef;

  constructor(private upscaleWsService: UpscaleWsService) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  showToast(message: string, isError: boolean = false) {
    // Get the appropriate sample toast element
    const sampleElement = isError
      ? this.toastErrorSample.nativeElement
      : this.toastSuccessSample.nativeElement;

    // Clone the sample toast
    const newToast = sampleElement.cloneNode(true) as HTMLElement;

    // Remove the 'hidden' class
    newToast.classList.remove('hidden');

    // Find the text container div within the cloned toast
    const textContainer = newToast.querySelector('.flex.p-2');

    // Create and insert the message text node at the beginning
    const messageNode = document.createElement('div');
    messageNode.textContent = message;
    textContainer?.insertBefore(messageNode, textContainer.firstChild);

    // Add click handler to close button
    const closeButton = newToast.querySelector('button');
    closeButton?.addEventListener('click', () => {
      newToast.remove();
    });

    // Add auto-remove after 5 seconds
    setTimeout(() => {
      if (newToast && newToast.parentElement) {
        newToast.remove();
      }
    }, 5000);

    // Prepend the new toast to the container
    this.toastContainer.nativeElement.prepend(newToast);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.imagePreview = e.target?.result as string;

        const base64 = this.imagePreview.split(",")[1]
        this.upscaleWsService.sendMessage({image: base64})
      };

      reader.readAsDataURL(file); // Convert file to data URL
    } else {
      this.showToast("Please upload an image file", true)
    }
  }
}
