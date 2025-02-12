# How to get it to work with rush

React native is full of reliances on implicit dependencie, so requires some work arounds to get it to work with rush.

First follow these instructions:
https://gist.github.com/Zn4rK/ed60c380e7b672e3089074f51792a2b8

Then add some implicit dependencies to the package.json:

```
"react-native-css-interop": "^0.1.22",
"@react-navigation/elements": "^2.2.5"
```