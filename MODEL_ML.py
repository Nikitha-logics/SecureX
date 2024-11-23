import re
from urllib.parse import urlparse
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import train_test_split

# Load and preprocess the dataset
df = pd.read_csv('malicious_phish.csv')
print("i am here")
# Feature engineering functions
def having_ip_address(url):
    match = re.search(
        r'(([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.([01]?\d\d?|2[0-4]\d|25[0-5])\.)', url)
    return 1 if match else 0

def abnormal_url(url):
    hostname = urlparse(url).hostname
    return 0 if hostname and hostname in url else 1

def count_characters(url, char):
    return url.count(char)

def no_of_dir(url):
    return urlparse(url).path.count('/')

def shortening_service(url):
    match = re.search(r'bit\.ly|goo\.gl|t\.co|tinyurl|is\.gd|ow\.ly|shorte\.st|cli\.gs|x\.co|tr\.im', url)
    return 1 if match else 0

def url_length(url):
    return len(str(url))

def hostname_length(url):
    return len(urlparse(url).netloc)

def suspicious_words(url):
    match = re.search(r'paypal|login|signin|bank|account|update|free|bonus|ebay|secure', url, re.IGNORECASE)
    return 1 if match else 0
#
def digit_count(url):
    return sum(char.isdigit() for char in url)

def letter_count(url):
    return sum(char.isalpha() for char in url)

def fd_length(url):
    try:
        return len(urlparse(url).path.split('/')[1])
    except IndexError:
        return 0

# Apply feature engineering
df['use_of_ip'] = df['url'].apply(having_ip_address)
df['abnormal_url'] = df['url'].apply(abnormal_url)
df['count.'] = df['url'].apply(lambda i: count_characters(i, '.'))
df['count-www'] = df['url'].apply(lambda i: count_characters(i, 'www'))
df['count@'] = df['url'].apply(lambda i: count_characters(i, '@'))
df['count_dir'] = df['url'].apply(no_of_dir)
df['short_url'] = df['url'].apply(shortening_service)
df['count-https'] = df['url'].apply(lambda i: count_characters(i, 'https'))
df['count-http'] = df['url'].apply(lambda i: count_characters(i, 'http'))
df['count%'] = df['url'].apply(lambda i: count_characters(i, '%'))
df['count?'] = df['url'].apply(lambda i: count_characters(i, '?'))
df['count-'] = df['url'].apply(lambda i: count_characters(i, '-'))
df['count='] = df['url'].apply(lambda i: count_characters(i, '='))
df['url_length'] = df['url'].apply(url_length)
df['hostname_length'] = df['url'].apply(hostname_length)
df['sus_url'] = df['url'].apply(suspicious_words)
df['count-digits'] = df['url'].apply(digit_count)
df['count-letters'] = df['url'].apply(letter_count)
df['fd_length'] = df['url'].apply(fd_length)

# Encode target labels
df["type_code"] = df["type"].astype('category').cat.codes

# Split dataset
X = df[['use_of_ip', 'abnormal_url', 'count.', 'count-www', 'count@',
        'count_dir', 'short_url', 'count-https', 'count-http', 'count%',
        'count?', 'count-', 'count=', 'url_length', 'hostname_length',
        'sus_url', 'fd_length', 'count-digits', 'count-letters']]
y = df['type_code']
X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.2, random_state=42)
print("i am here")
# Train model
rf = RandomForestClassifier(n_estimators=100, max_features='sqrt', random_state=42)
rf.fit(X_train, y_train)
y_pred_rf = rf.predict(X_test)
print(classification_report(y_test, y_pred_rf))

# Function to extract features from a URL
def extract_features(url):
    return [
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

# Function to predict the type of URL
def get_prediction(url):
    features = np.array(extract_features(url)).reshape(1, -1)
    pred = rf.predict(features)
    labels = {0: "SAFE", 1: "DEFACEMENT", 2: "PHISHING", 3: "MALWARE"}
    return labels[int(pred[0])]

# Continuous user input
#hi
while True:
    url = input("Enter a URL to check (or enter 0 to exit): ")
    if url == "0":
        print("Exiting the program. Stay safe!")
        break
    print(f"The URL is classified as: {get_prediction(url)}")
