from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from urllib.parse import urlparse
import re

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load the pre-trained model
with open('url_classifier.pkl', 'rb') as f:
    model = pickle.load(f)

# ----------------- Feature Extraction Functions -----------------
def having_ip_address(url):
    """Check if URL contains an IP address."""
    match = re.search(
        r'(([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.)', url)
    return 1 if match else 0

def abnormal_url(url):
    """Check for abnormal URL by comparing the hostname and URL."""
    hostname = urlparse(url).hostname
    return 0 if hostname and hostname in url else 1

def count_characters(url, char):
    """Count occurrences of a specific character in the URL."""
    return url.count(char)

def no_of_dir(url):
    """Count the number of directories in the URL path."""
    return urlparse(url).path.count('/')

def shortening_service(url):
    """Check if URL uses a shortening service."""
    match = re.search(r'bit\.ly|goo\.gl|t\.co|tinyurl|is\.gd|ow\.ly|shorte\.st|cli\.gs|x\.co|tr\.im', url)
    return 1 if match else 0

def url_length(url):
    """Calculate the length of the URL."""
    return len(str(url))

def hostname_length(url):
    """Calculate the length of the hostname."""
    return len(urlparse(url).netloc)

def suspicious_words(url):
    """Check for suspicious words in the URL."""
    match = re.search(r'paypal|login|signin|bank|account|update|free|bonus|ebay|secure', url, re.IGNORECASE)
    return 1 if match else 0

def digit_count(url):
    """Count the number of digits in the URL."""
    return sum(char.isdigit() for char in url)

def letter_count(url):
    """Count the number of letters in the URL."""
    return sum(char.isalpha() for char in url)

def fd_length(url):
    """Get the length of the first directory in the URL path."""
    try:
        return len(urlparse(url).path.split('/')[1])
    except IndexError:
        return 0

def extract_features(url):
    """Extract all features from the URL for classification."""
    features = [
        having_ip_address(url),
        abnormal_url(url),
        count_characters(url, '.'),
        count_characters(url, 'www'),
        count_characters(url, '@'),
        no_of_dir(url),
        shortening_service(url),
        count_characters(url, 'https'),
        count_characters(url, 'http'),
        count_characters(url, '%'),
        count_characters(url, '?'),
        count_characters(url, '-'),
        count_characters(url, '='),
        url_length(url),
        hostname_length(url),
        suspicious_words(url),
        fd_length(url),
        digit_count(url),
        letter_count(url)
    ]
    return features

# ---------------------- API Endpoints ----------------------
@app.route('/predict', methods=['POST'])
def predict():
    """Predict the safety status of a single URL."""
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({'error': 'Invalid JSON format or "url" not provided'}), 400
        
        url = data['url']
        features = np.array(extract_features(url)).reshape(1, -1)
        prediction = model.predict(features)[0]
        
        labels = {0: "SAFE", 1: "DEFACEMENT", 2: "PHISHING", 3: "MALWARE"}
        result = {
            'url': url,
            'prediction': labels[prediction],
            'prediction_code': int(prediction),
            'safety_status': "SAFE" if prediction == 0 else "NOT SAFE",
            'details': {
                'has_ip_address': bool(having_ip_address(url)),
                'is_shortened_url': bool(shortening_service(url)),
                'has_suspicious_words': bool(suspicious_words(url)),
                'url_length': url_length(url),
                'contains_suspicious_chars': bool(count_characters(url, '@') or count_characters(url, '%'))
            }
        }
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/bulk-predict', methods=['POST'])
def bulk_predict():
    """Predict the safety status of multiple URLs."""
    try:
        data = request.get_json()
        if not data or 'urls' not in data:
            return jsonify({'error': 'Invalid JSON format or "urls" not provided'}), 400
        
        urls = data['urls']
        results = []
        labels = {0: "SAFE", 1: "DEFACEMENT", 2: "PHISHING", 3: "MALWARE"}
        
        for url in urls:
            features = np.array(extract_features(url)).reshape(1, -1)
            prediction = model.predict(features)[0]
            result = {
                'url': url,
                'prediction': labels[prediction],
                'safety_status': "SAFE" if prediction == 0 else "NOT SAFE"
            }
            results.append(result)
        
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Check API health status."""
    return jsonify({'status': 'healthy'}), 200

# ---------------------- Main Function ----------------------
if __name__ == '__main__':
    print("URL Classifier API is running!")
    print("\nEndpoints available:")
    print("1. POST /predict - Test single URL")
    print("   Example request: {'url': 'https://example.com'}")
    print("\n2. POST /bulk-predict - Test multiple URLs")
    print("   Example request: {'urls': ['https://example1.com', 'https://example2.com']}")
    print("\n3. GET /health - Check API status")
    print("\nRunning on http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
