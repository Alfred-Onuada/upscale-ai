import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class UpscaleWsService {
  private socket!: Socket;

  constructor (private http: HttpClient) {}

  /**
   * Makes a request to start the WS server
   */
  pingServer(): Observable<any> {
    return this.http.get(environment.baseApiUrl)
  }

  connectToWS(): Observable<any> {
    return new Observable<any>(observer => {
      // Create a new Socket.IO connection
      this.socket = io(environment.baseApiUrlWS);
  
      // Listen for successful connection
      this.socket.on('connect', () => {
        observer.next("connected")
      });
  
      // Listen for disconnection
      this.socket.on('disconnect', () => {
        observer.error("Disconnected from server")
      });

      return () => {};
    })
  }

  upscaleImage(data: string): string | undefined {
    if (!this.socket) {
      return 'Socket not initialized. Call connectToWS() first.'
    }

    this.socket.emit('upscale', data);
    return
  }

  listenToUpscaleResult(): Observable<any> {
    return new Observable<any>(observer => {
      if (!this.socket) {
        observer.error('Socket not initialized. Call connectToWS() first.');
        return;
      }
      this.socket.on('upscale-result', (data: any) => {
        observer.next(data);
      });

      this.socket.on('upscale-failure', (err: any) => {
        observer.error(err)
      })

      // Optionally handle socket disconnection (this is teardown logic)
      return () => {
        this.socket.off('upscale-result');
        this.socket.off('upscale-failure')
      }
    });
  }
}