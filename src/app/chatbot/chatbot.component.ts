// Importing necessary features from Angular's core library.
import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';

// HttpClient is used to make HTTP requests (like GET, POST) to external servers.
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Importing environment settings from the Angular project's environment file.
import { environment } from 'src/environments/environment';

// DomSanitizer helps in preventing Cross Site Scripting Security bugs (XSS) 
// by sanitizing values to be safe to use in the different DOM contexts.
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// lastValueFrom is a utility function that converts an Observable (a stream of data) 
// into a Promise (a single future value), making it easier to use in async/await syntax.
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-chatbot',
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.scss']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  // A reference to the container where messages will be displayed in the UI.
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  // An array to store the chat messages (both user and bot responses).
  messages: ChatMessage[] = [];

  // A string variable to capture and handle user input text.
  userInput: string = '';

  // URL to the OpenAI API for sending and receiving chat completions.
  apiUrl = 'https://api.openai.com/v1/chat/completions';

  // URL to your backend server for retrieving the API key.
  backendUrl = 'https://vercel.com/vahjela17s-projects/chatbot-tutorial/GYNz9S7wUo3kKgbc5UopcDjCPtd5/api/getApiKey.js';

  // Variables to track the loading state and any errors that occur.
  loading: boolean = false;
  error: string | null = null;

  // Paths to the images used for the user and the bot in the chat UI.
  userImagePath = 'assets/img/Jim.png';
  botImagePath = 'assets/img/botImage.png';

  // Variables to hold the formatted response from the API and any custom error messages.
  formattedResponse: SafeHtml = '';
  customErrorMessage: string | null = null;

  // Additional variables to track the loading state and occurrence of errors.
  isLoading: boolean = false;
  errorOccurred: boolean = false;
  

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) { }


 //OnInit Lifecycle Hook: Executes when the component is initialized.
 //Here, it's used to add an initial welcome message to the chat from the chatbot.
 ngOnInit() {
    this.messages.push({ text: "Hi, I'm Fred! How can I help you today?", user: false });
  }

// ngAfterViewChecked runs after Angular updates the view.
ngAfterViewChecked() {
    // Calls scrollToBottom to scroll the chat to the latest message.
    this.scrollToBottom();
}

// Scrolls the message container to show the most recent chat message.
private scrollToBottom(): void {
    try {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight; // Scroll to the bottom of the chat.
    } catch (err) { /* Error handling is ignored for simplicity. */ }
}

// Adjusts the height of the text input to fit the content as the user types.
autoGrow(event: any): void {
    const textArea = event.target;
    textArea.style.height = 'auto'; // Reset height.
    textArea.style.height = textArea.scrollHeight + 'px'; // Expand to fit content.
}
async getApiKey(): Promise<string> {
  try {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.AUTH_TOKEN}`
    });

    const response = this.http.get<{ apiKey: string }>('/api/getApiKey', { headers });
    const data = await lastValueFrom(response);
    return data.apiKey || '';
  } catch (error) {
    console.error('Error fetching API key:', error);
    return '';
  }
}
async sendMessage() {
  if (this.userInput.trim() === '') return;

  this.messages.push({ text: this.userInput, user: true });

  const userMessage = this.userInput;
  const apiKey = await this.getApiKey(); // Retrieve the API key from the backend

  if (!apiKey) {
    this.handleError('Failed to retrieve API key.');
    return;
  }

  const headers = new HttpHeaders({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  });

  const conversation = [
    { role: 'system', content: 'You are personable chatbot.' },
    { role: 'user', content: userMessage },
  ];

  this.isLoading = true;
  this.errorOccurred = false;
  this.customErrorMessage = '';

  try {
    const response = await this.http.post(this.apiUrl, { model: 'gpt-4', messages: conversation }, { headers }).toPromise();

    if (response && 'choices' in response) {
      const apiResponse: ApiResponse = response as ApiResponse;
      const botResponse = apiResponse.choices[0].message.content.trim();

      // Push the bot's response to the messages array
      this.messages.push({ text: botResponse, user: false });

      // Format and set the response
      this.formattedResponse = this.formatCodeBlock(botResponse);
    } else {
      this.handleError("Invalid or empty response from the API.");
    }
  } catch (error) {
    this.handleError("I'm experiencing technical difficulties at the moment. Please try again later.");
    console.error(error);
  } finally {
    this.isLoading = false;
  }
  this.userInput = ''; // Clear the input field
}

handleError(errorMessage: string): void {
  this.customErrorMessage = errorMessage;
  this.errorOccurred = true; // Set error flag to true
}

formatCodeBlock(code: string): SafeHtml {
  const formattedCode = this.sanitizer.bypassSecurityTrustHtml(`<pre><code>${code}</code></pre>`);
  return formattedCode;
}
}

// Define the ApiResponse type based on the expected structure
interface ApiResponse {
choices: { message: { content: string } }[];
}

interface ChatMessage {
text: string;
user: boolean;
}

